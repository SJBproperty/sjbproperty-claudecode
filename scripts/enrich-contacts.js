/**
 * Tiered contact enrichment waterfall for top-scored landlords.
 *
 * Tiers (run in sequence, skip lead once email found):
 *   0a: CH filing email extraction (free)
 *   CH officers: Director names + registered office (free)
 *   0b: OpenRent rescrape for contact fields (Apify, free data)
 *   1:  Snov.io email finding (50 free credits, Stockport SK only)
 *   2:  Apify email finder actors (pay-per-result)
 *   3:  Firecrawl crawl company websites (pay-per-page)
 *   4:  Flag remaining as direct mail candidates
 *
 * Usage:
 *   node scripts/enrich-contacts.js --tier=all
 *   node scripts/enrich-contacts.js --tier=ch-officers
 *   node scripts/enrich-contacts.js --tier=ch-filings --min-score=60
 *   node scripts/enrich-contacts.js --tier=snov --limit=50
 */

require('dotenv').config();
const https = require('https');
const { CH_API_BASE, SNOV_API_BASE } = require('./lib/config');

// --- Auth ---
const CH_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const CH_AUTH = Buffer.from((CH_API_KEY || '') + ':').toString('base64');

// --- Utility ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a rate limiter (same pattern as companies-house.js).
 */
function createRateLimiter(maxRequests = 600, windowMs = 300000) {
  const timestamps = [];
  const safetyMargin = 50;

  function prune(now) {
    const cutoff = now - windowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }

  return {
    recordRequest(now) {
      if (now === undefined) now = Date.now();
      timestamps.push(now);
    },
    shouldWait(now) {
      if (now === undefined) now = Date.now();
      prune(now);
      return timestamps.length >= (maxRequests - safetyMargin);
    },
    async waitIfNeeded() {
      const now = Date.now();
      prune(now);
      if (timestamps.length >= (maxRequests - safetyMargin)) {
        const oldestInWindow = timestamps[0];
        const waitMs = (oldestInWindow + windowMs) - now + 1000;
        console.log(`  Rate limit: ${timestamps.length}/${maxRequests} requests in window. Waiting ${Math.ceil(waitMs / 1000)}s...`);
        await sleep(waitMs);
      }
    },
  };
}

const chRateLimiter = createRateLimiter(600, 300000);

// --- Service address detection ---

const SERVICE_ADDRESS_KEYWORDS = [
  'accountant', 'accounting', 'formations', 'services ltd',
  'registered office', 'virtual office', 'mail box', 'mailbox',
  'business centre', 'business center', 'serviced office',
  'company secretar', 'nominees', 'agents',
];

/**
 * Detect if an address is a service address (accountant, formations agent, etc.)
 * @param {string} address
 * @returns {boolean}
 */
function isServiceAddress(address) {
  if (!address) return false;
  const lower = address.toLowerCase();
  return SERVICE_ADDRESS_KEYWORDS.some(kw => lower.includes(kw));
}

// --- HTTP fetcher (injectable for testing) ---

/**
 * Make rate-limited HTTPS GET to Companies House API.
 * @param {string} url
 * @param {Function} [fetchFn] - injectable fetcher for testing
 * @returns {Promise<object>}
 */
async function chFetch(url, fetchFn) {
  if (fetchFn) return fetchFn(url);

  await chRateLimiter.waitIfNeeded();
  chRateLimiter.recordRequest();

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'Authorization': `Basic ${CH_AUTH}` },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Failed to parse CH response: ${e.message}`)); }
        } else if (res.statusCode === 404) {
          resolve({ items: [] });
        } else {
          reject(new Error(`CH API error ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
  });
}

/**
 * Make an HTTPS request (POST or GET) to any URL.
 * @param {string} url
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.body]
 * @param {object} [options.headers]
 * @param {Function} [fetchFn] - injectable fetcher for testing
 * @returns {Promise<object>}
 */
async function httpRequest(url, options = {}, fetchFn) {
  if (fetchFn) return fetchFn(url, options);

  const urlObj = new URL(url);
  const method = options.method || 'GET';
  const bodyStr = options.body ? JSON.stringify(options.body) : null;

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        ...options.headers,
        ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = (urlObj.protocol === 'https:' ? https : require('http')).request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data, statusCode: res.statusCode }); }
      });
    });
    req.setTimeout(15000, () => { req.destroy(new Error('Request timeout (15s)')); });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// --- Email regex ---
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Extract email addresses from text.
 * @param {string} text
 * @returns {string[]}
 */
function extractEmails(text) {
  if (!text) return [];
  const matches = text.match(EMAIL_REGEX);
  if (!matches) return [];
  // Filter out common false positives
  return [...new Set(matches)].filter(email => {
    const lower = email.toLowerCase();
    return !lower.endsWith('.gov.uk') &&
           !lower.includes('companieshouse') &&
           !lower.includes('example.com') &&
           !lower.includes('noreply');
  });
}

// ============================================================
// PRE-TIER: CH Company Number Lookup
// ============================================================

/**
 * Search Companies House for company numbers for Ltd/LLP landlords missing them.
 * @param {object} db
 * @param {object} options
 * @param {number} [options.minScore=50]
 * @param {Function} [options.fetchFn]
 * @returns {Promise<object>}
 */
async function enrichCHCompanySearch(db, options = {}) {
  const { minScore = 50, fetchFn } = options;

  const landlords = db.prepare(`
    SELECT id, name
    FROM landlords
    WHERE tired_score >= ?
      AND entity_type IN ('ltd', 'llp')
      AND company_number IS NULL
    ORDER BY tired_score DESC
  `).all(minScore);

  console.log(`CH Company Search: ${landlords.length} Ltd/LLP landlords without company numbers`);

  const updateStmt = db.prepare(`
    UPDATE landlords SET company_number = ? WHERE id = ?
  `);

  let found = 0;
  let skipped = 0;

  for (const landlord of landlords) {
    // Clean name for search: remove common suffixes that CH search handles poorly
    const searchName = landlord.name
      .replace(/\b(THE|TRUSTEES?( OF)?|INCORPORATED|IN THE COUNTY OF.*|IN THE DIOCESE OF.*)\b/gi, '')
      .trim();

    // Skip names that are clearly not companies (churches, trusts, NHS, etc.)
    const nonCompanyKeywords = ['CHURCH', 'DIOCESE', 'NHS', 'TRUST', 'CHARITY', 'BENEFICE', 'INCUMBENT', 'AMBULANCE'];
    if (nonCompanyKeywords.some(kw => landlord.name.toUpperCase().includes(kw))) {
      skipped++;
      continue;
    }

    try {
      const url = `${CH_API_BASE}/search/companies?q=${encodeURIComponent(searchName)}&items_per_page=5`;
      const result = await chFetch(url, fetchFn);
      const items = (result.items || []).filter(c =>
        c.company_status === 'active' &&
        c.title.toUpperCase().includes(searchName.split(/\s+/)[0].toUpperCase())
      );

      if (items.length > 0) {
        // Take the best match (first result)
        updateStmt.run(items[0].company_number, landlord.id);
        found++;
      }
    } catch (err) {
      console.error(`  Warning: CH search failed for "${landlord.name}": ${err.message}`);
    }
  }

  console.log(`CH Company Search: ${found} company numbers found, ${skipped} non-companies skipped`);
  return { found, skipped };
}

// ============================================================
// TIER: CH Officer Lookup
// ============================================================

/**
 * Enrich Ltd/LLP landlords with director names and registered office from CH.
 * @param {object} db - better-sqlite3 database
 * @param {object} options
 * @param {number} [options.minScore=50]
 * @param {number} [options.limit]
 * @param {Function} [options.fetchFn] - injectable fetcher for testing
 * @returns {Promise<object>} stats
 */
async function enrichCHOfficers(db, options = {}) {
  const { minScore = 50, limit, fetchFn } = options;

  let sql = `
    SELECT id, name, company_number
    FROM landlords
    WHERE tired_score >= ?
      AND entity_type IN ('ltd', 'llp')
      AND company_number IS NOT NULL
      AND director_names IS NULL
    ORDER BY tired_score DESC
  `;
  if (limit) sql += ` LIMIT ${parseInt(limit)}`;

  const landlords = db.prepare(sql).all(minScore);
  console.log(`CH Officers: ${landlords.length} Ltd/LLP landlords to look up`);

  const updateStmt = db.prepare(`
    UPDATE landlords
    SET director_names = ?, mailing_address = COALESCE(mailing_address, ?),
        enrichment_source = COALESCE(enrichment_source, 'companies-house'),
        enrichment_date = ?
    WHERE id = ?
  `);

  let looked = 0;
  let serviceAddresses = 0;

  for (const landlord of landlords) {
    try {
      const url = `${CH_API_BASE}/company/${landlord.company_number}/officers`;
      const result = await chFetch(url, fetchFn);
      const officers = (result.items || []).filter(o => !o.resigned_on);
      const directorNames = officers.map(o => o.name).join(', ');

      // Get registered office address
      let mailingAddress = null;
      if (officers.length > 0 && officers[0].address) {
        const addr = officers[0].address;
        const formatted = [addr.premises, addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code, addr.country]
          .filter(f => f != null && f !== '')
          .join(', ');

        if (isServiceAddress(formatted)) {
          serviceAddresses++;
          // Leave mailing_address NULL for service addresses
        } else {
          mailingAddress = formatted;
        }
      }

      if (directorNames) {
        updateStmt.run(directorNames, mailingAddress, new Date().toISOString(), landlord.id);
        looked++;
      }
    } catch (err) {
      console.error(`  Warning: CH officer lookup failed for ${landlord.company_number}: ${err.message}`);
    }
  }

  console.log(`CH Officers: ${looked} directors extracted, ${serviceAddresses} service addresses flagged`);
  return { looked, serviceAddresses };
}

// ============================================================
// TIER 0a: CH Filing Email Extraction
// ============================================================

/**
 * Extract emails from CH filing history (confirmation statements).
 * @param {object} db
 * @param {object} options
 * @param {number} [options.minScore=50]
 * @param {number} [options.limit]
 * @param {Function} [options.fetchFn]
 * @returns {Promise<object>}
 */
async function enrichCHFilings(db, options = {}) {
  const { minScore = 50, limit, fetchFn } = options;

  let sql = `
    SELECT id, name, company_number
    FROM landlords
    WHERE tired_score >= ?
      AND email IS NULL
      AND company_number IS NOT NULL
    ORDER BY tired_score DESC
  `;
  if (limit) sql += ` LIMIT ${parseInt(limit)}`;

  const landlords = db.prepare(sql).all(minScore);
  console.log(`CH Filings: ${landlords.length} landlords to check for filing emails`);

  const updateStmt = db.prepare(`
    UPDATE landlords
    SET email = ?, enrichment_source = 'ch-filing', enrichment_date = ?
    WHERE id = ? AND email IS NULL
  `);

  let found = 0;

  for (const landlord of landlords) {
    try {
      const url = `${CH_API_BASE}/company/${landlord.company_number}/filing-history?items_per_page=5&category=confirmation-statement`;
      const result = await chFetch(url, fetchFn);
      const items = result.items || [];

      for (const item of items) {
        const text = JSON.stringify(item);
        const emails = extractEmails(text);
        if (emails.length > 0) {
          updateStmt.run(emails[0], new Date().toISOString(), landlord.id);
          found++;
          break;
        }
      }
    } catch (err) {
      console.error(`  Warning: CH filing check failed for ${landlord.company_number}: ${err.message}`);
    }
  }

  console.log(`CH Filings: ${found} emails extracted from filing history`);
  return { found };
}

// ============================================================
// MAILING ADDRESS FALLBACK
// ============================================================

/**
 * For landlords still missing a mailing address, use their most recent property address.
 * These become PRIME direct mail candidates.
 * @param {object} db
 * @param {object} options
 * @param {number} [options.minScore=50]
 * @returns {object}
 */
function enrichMailFallback(db, options = {}) {
  const { minScore = 50 } = options;

  const landlords = db.prepare(`
    SELECT id, name
    FROM landlords
    WHERE tired_score >= ?
      AND mailing_address IS NULL
    ORDER BY tired_score DESC
  `).all(minScore);

  console.log(`Mail Fallback: ${landlords.length} landlords without mailing address`);

  const getProperty = db.prepare(`
    SELECT address, postcode FROM properties
    WHERE landlord_id = ?
    ORDER BY created_at DESC LIMIT 1
  `);

  const updateStmt = db.prepare(`
    UPDATE landlords
    SET mailing_address = ?, enrichment_date = COALESCE(enrichment_date, ?)
    WHERE id = ? AND mailing_address IS NULL
  `);

  let set = 0;

  for (const landlord of landlords) {
    const prop = getProperty.get(landlord.id);
    if (prop) {
      const addr = [prop.address, prop.postcode].filter(Boolean).join(', ');
      if (addr) {
        updateStmt.run(addr, new Date().toISOString(), landlord.id);
        set++;
      }
    }
  }

  console.log(`Mail Fallback: ${set} mailing addresses set from property addresses`);
  return { set };
}

// ============================================================
// TIER 0b: OpenRent Rescrape
// ============================================================

/**
 * OpenRent rescrape for contact fields via Apify.
 * Best-effort - many actors don't expose landlord email.
 * @param {object} db
 * @param {object} options
 * @returns {Promise<object>}
 */
async function enrichOpenRent(db, options = {}) {
  const { minScore = 50 } = options;

  // Count how many leads still need email
  const count = db.prepare('SELECT COUNT(*) as c FROM landlords WHERE tired_score >= ? AND email IS NULL').get(minScore);
  console.log(`OpenRent Rescrape: ${count.c} leads still without email`);
  console.log(`OpenRent Rescrape: Skipped - OpenRent actors typically do not expose landlord email/phone.`);
  console.log(`  This tier is best-effort. To enable: configure an Apify actor that returns landlord contact details.`);

  return { found: 0, skipped: true };
}

// ============================================================
// TIER 1: Snov.io Email Finding
// ============================================================

/**
 * Find emails via Snov.io for Stockport SK-postcode leads.
 * Limited to free trial credits (default 50).
 * @param {object} db
 * @param {object} options
 * @param {number} [options.minScore=50]
 * @param {number} [options.creditLimit=50]
 * @param {Function} [options.fetchFn]
 * @returns {Promise<object>}
 */
async function enrichSnov(db, options = {}) {
  const { minScore = 50, creditLimit = 50, fetchFn } = options;

  const clientId = process.env.SNOV_CLIENT_ID;
  const clientSecret = process.env.SNOV_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('Snov.io: SNOV_CLIENT_ID/SNOV_CLIENT_SECRET not set in .env. Skipping tier.');
    return { found: 0, creditsUsed: 0, skipped: true };
  }

  // Get Ltd/LLP landlords with company numbers (they have guessable domains)
  const landlords = db.prepare(`
    SELECT l.id, l.name, l.director_names, l.company_number
    FROM landlords l
    WHERE l.tired_score >= ?
      AND l.email IS NULL
      AND l.entity_type IN ('ltd', 'llp')
      AND l.company_number IS NOT NULL
    ORDER BY l.tired_score DESC
  `).all(minScore);

  console.log(`Snov.io: ${landlords.length} Ltd/LLP leads with company numbers. Credit limit: ${creditLimit}`);

  // Authenticate
  let accessToken;
  try {
    const authResult = await httpRequest(`${SNOV_API_BASE}/v1/oauth/access_token`, {
      method: 'POST',
      body: { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret },
    }, fetchFn);
    accessToken = authResult.access_token;
    if (!accessToken) {
      console.log('Snov.io: Authentication failed. Skipping tier.');
      return { found: 0, creditsUsed: 0, skipped: true };
    }
  } catch (err) {
    console.log(`Snov.io: Auth error: ${err.message}. Skipping tier.`);
    return { found: 0, creditsUsed: 0, skipped: true };
  }

  const updateStmt = db.prepare(`
    UPDATE landlords
    SET email = ?, enrichment_source = 'snov.io', enrichment_date = ?
    WHERE id = ? AND email IS NULL
  `);

  let found = 0;
  let creditsUsed = 0;

  for (const landlord of landlords) {
    if (creditsUsed >= creditLimit) {
      console.log(`Snov.io: Credit limit reached (${creditsUsed} credits used). Remaining leads proceed to Tier 2.`);
      break;
    }

    // Parse director name if available, otherwise use company name
    let firstName = '';
    let lastName = '';
    if (landlord.director_names) {
      const firstDirector = landlord.director_names.split(',')[0].trim();
      const nameParts = firstDirector.split(/[,\s]+/).filter(Boolean);
      // CH format is "SURNAME, FirstName"
      lastName = (nameParts[0] || '').replace(/,/g, '');
      firstName = nameParts.length > 1 ? nameParts[1] : '';
    }

    // Try domain guesses from company name
    const companySlug = (landlord.name || '').replace(/\s+/g, '').replace(/ltd\.?|limited|llp|property|properties|estates?|developments?|lettings?|investments?/gi, '').toLowerCase();
    if (!companySlug) continue;
    const domains = [`${companySlug}.co.uk`, `${companySlug}.com`];
    // Also try shorter slug (first word only)
    const firstWord = companySlug.match(/^[a-z]+/);
    if (firstWord && firstWord[0].length >= 4 && firstWord[0] !== companySlug) {
      domains.push(`${firstWord[0]}properties.co.uk`, `${firstWord[0]}lettings.co.uk`);
    }

    for (const domain of domains) {
      if (creditsUsed >= creditLimit) break;

      try {
        // Check domain email count
        const countResult = await httpRequest(`${SNOV_API_BASE}/v1/get-domain-emails-count`, {
          method: 'POST',
          body: { domain, access_token: accessToken },
        }, fetchFn);
        creditsUsed++;

        if (countResult.result === 0 || countResult.webmail === true) continue;

        let emailFound = false;

        // If we have director names, try name-based lookup
        if (firstName && lastName) {
          const findResult = await httpRequest(`${SNOV_API_BASE}/v2/emails-by-domain-by-name/start`, {
            method: 'POST',
            body: {
              rows: [{ first_name: firstName, last_name: lastName, domain }],
              access_token: accessToken,
            },
          }, fetchFn);
          creditsUsed++;

          const taskHash = findResult.task_hash;
          if (taskHash) {
            for (let attempt = 0; attempt < 5; attempt++) {
              await sleep(2000);
              const pollResult = await httpRequest(
                `${SNOV_API_BASE}/v2/emails-by-domain-by-name/result?task_hash=${taskHash}&access_token=${accessToken}`,
                { method: 'GET' },
                fetchFn
              );

              if (pollResult.data && pollResult.data.length > 0) {
                const emailData = pollResult.data[0];
                if (emailData.email) {
                  updateStmt.run(emailData.email, new Date().toISOString(), landlord.id);
                  found++;
                  emailFound = true;
                  break;
                }
              }
              if (pollResult.status === 'complete' || pollResult.status === 'not_found') break;
            }
          }
        }

        // If no name-based match, try domain-level email list
        if (!emailFound) {
          const domainResult = await httpRequest(`${SNOV_API_BASE}/v1/get-domain-emails-with-info`, {
            method: 'POST',
            body: { domain, access_token: accessToken, type: 'all', limit: 1 },
          }, fetchFn);
          creditsUsed++;

          if (domainResult.emails && domainResult.emails.length > 0) {
            const email = domainResult.emails[0].email;
            if (email) {
              updateStmt.run(email, new Date().toISOString(), landlord.id);
              found++;
              emailFound = true;
            }
          }
        }

        if (emailFound) break; // exit domain loop once email found
      } catch (err) {
        console.error(`  Snov.io error for ${landlord.name}: ${err.message}`);
      }

      // Rate limit: max 60 req/min
      await sleep(1100);
    }
  }

  console.log(`Snov.io: ${found} emails found, ${creditsUsed} credits used`);
  return { found, creditsUsed };
}

// ============================================================
// TIER 2: Apify Email Finder
// ============================================================

/**
 * Use Apify clearpath/email-finder-api for Ltd/LLP landlords with director names.
 * Finds emails by first name + last name + company domain.
 * @param {object} db
 * @param {object} options
 * @param {number} [options.minScore=50]
 * @param {number} [options.limit=100]
 * @param {Function} [options.fetchFn]
 * @returns {Promise<object>}
 */
async function enrichApify(db, options = {}) {
  const { minScore = 50, limit = 100, fetchFn } = options;

  const apifyToken = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY;
  if (!apifyToken) {
    const count = db.prepare('SELECT COUNT(*) as c FROM landlords WHERE tired_score >= ? AND email IS NULL').get(minScore);
    console.log(`Apify Email Finder: ${count.c} leads still without email`);
    console.log(`Apify Email Finder: APIFY_TOKEN not set in .env. Skipping tier.`);
    return { found: 0, skipped: true };
  }

  // Get Ltd/LLP landlords with director names but no email
  const landlords = db.prepare(`
    SELECT id, name, director_names, company_number
    FROM landlords
    WHERE tired_score >= ?
      AND email IS NULL
      AND entity_type IN ('ltd', 'llp')
      AND director_names IS NOT NULL
    ORDER BY tired_score DESC
    LIMIT ?
  `).all(minScore, limit);

  console.log(`Apify Email Finder: ${landlords.length} Ltd/LLP leads with director names to check`);
  if (landlords.length === 0) return { found: 0 };

  const updateStmt = db.prepare(`
    UPDATE landlords SET email = ?, enrichment_source = 'apify', enrichment_date = ?
    WHERE id = ? AND email IS NULL
  `);

  let found = 0;

  // Build CSV input for batch processing
  const csvRows = [];
  const landlordMap = new Map();
  for (const l of landlords) {
    const firstDirector = (l.director_names || '').split(',')[0].trim();
    const parts = firstDirector.split(/[,\s]+/).filter(Boolean);
    const lastName = (parts[0] || '').replace(/,/g, '');
    const firstName = parts.length > 1 ? parts[1] : '';
    const slug = (l.name || '').replace(/\s+/g, '').replace(/ltd\.?|limited|llp|property|properties|estates?/gi, '').toLowerCase();
    if (!slug || !firstName || !lastName) continue;
    const domain = `${slug}.co.uk`;
    csvRows.push({ firstName, lastName, domain, landlordId: l.id });
    landlordMap.set(`${firstName.toLowerCase()}_${lastName.toLowerCase()}_${domain}`, l.id);
  }

  // Process in batches of 10 to avoid overwhelming the actor
  for (let i = 0; i < csvRows.length; i += 10) {
    const batch = csvRows.slice(i, i + 10);
    const csvContent = 'first_name,last_name,domain\\n' + batch.map(r => `${r.firstName},${r.lastName},${r.domain}`).join('\\n');

    try {
      const runResult = await httpRequest('https://api.apify.com/v2/acts/clearpath~email-finder-api/runs?waitForFinish=120', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apifyToken}` },
        body: { csvInput: csvContent },
      }, fetchFn);

      if (runResult.data && runResult.data.defaultDatasetId) {
        await sleep(5000); // Wait for results
        const datasetResult = await httpRequest(
          `https://api.apify.com/v2/datasets/${runResult.data.defaultDatasetId}/items?format=json`,
          { method: 'GET', headers: { 'Authorization': `Bearer ${apifyToken}` } },
          fetchFn
        );

        if (Array.isArray(datasetResult)) {
          for (const item of datasetResult) {
            if (item.email && item.confidence && item.confidence >= 50) {
              const key = `${(item.firstName || '').toLowerCase()}_${(item.lastName || '').toLowerCase()}_${item.domain}`;
              const landlordId = landlordMap.get(key) || batch.find(b =>
                b.firstName.toLowerCase() === (item.firstName || '').toLowerCase() &&
                b.lastName.toLowerCase() === (item.lastName || '').toLowerCase()
              )?.landlordId;
              if (landlordId) {
                updateStmt.run(item.email, new Date().toISOString(), landlordId);
                found++;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`  Apify batch error: ${err.message}`);
    }

    console.log(`  Apify: processed ${Math.min(i + 10, csvRows.length)}/${csvRows.length} leads (${found} emails found)`);
    await sleep(2000);
  }

  console.log(`Apify Email Finder: ${found} emails found from ${csvRows.length} leads checked`);
  return { found };
}

// ============================================================
// TIER 3: Firecrawl Crawl
// ============================================================

/**
 * Crawl guessable company websites for contact emails via Firecrawl API.
 * Tries {slug}.co.uk and {slug}.com, scrapes /contact and homepage for emails.
 * @param {object} db
 * @param {object} options
 * @param {number} [options.minScore=50]
 * @param {number} [options.limit=100]
 * @param {Function} [options.fetchFn]
 * @returns {Promise<object>}
 */
async function enrichFirecrawl(db, options = {}) {
  const { minScore = 50, limit = 100, fetchFn } = options;

  const fcApiKey = process.env.FIRECRAWL_API_KEY;
  if (!fcApiKey) {
    const count = db.prepare('SELECT COUNT(*) as c FROM landlords WHERE tired_score >= ? AND email IS NULL').get(minScore);
    console.log(`Firecrawl: ${count.c} leads still without email`);
    console.log(`Firecrawl: FIRECRAWL_API_KEY not set in .env. Skipping tier.`);
    return { found: 0, skipped: true };
  }

  // Get Ltd/LLP landlords still without email
  const landlords = db.prepare(`
    SELECT id, name
    FROM landlords
    WHERE tired_score >= ?
      AND email IS NULL
      AND entity_type IN ('ltd', 'llp')
    ORDER BY tired_score DESC
    LIMIT ?
  `).all(minScore, limit);

  console.log(`Firecrawl: ${landlords.length} Ltd/LLP leads to crawl for contact emails`);
  if (landlords.length === 0) return { found: 0 };

  const updateStmt = db.prepare(`
    UPDATE landlords SET email = ?, enrichment_source = 'firecrawl', enrichment_date = ?
    WHERE id = ? AND email IS NULL
  `);

  let found = 0;
  let crawled = 0;

  for (const landlord of landlords) {
    const slug = (landlord.name || '')
      .replace(/\s+/g, '')
      .replace(/ltd\.?|limited|llp|property|properties|estates?|developments?|lettings?|investments?/gi, '')
      .toLowerCase();
    if (!slug) continue;

    const urls = [`https://${slug}.co.uk`, `https://${slug}.com`];
    let emailFound = false;

    for (const baseUrl of urls) {
      if (emailFound) break;

      // Try scraping the homepage and /contact page
      for (const pagePath of ['', '/contact', '/contact-us', '/about']) {
        if (emailFound) break;
        const url = baseUrl + pagePath;

        try {
          const result = await httpRequest('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${fcApiKey}` },
            body: { url, formats: ['markdown'], timeout: 15000 },
          }, fetchFn);

          if (result.success && result.data && result.data.markdown) {
            const emails = extractEmails(result.data.markdown);
            if (emails.length > 0) {
              updateStmt.run(emails[0], new Date().toISOString(), landlord.id);
              found++;
              emailFound = true;
              console.log(`  Found email for ${landlord.name}: ${emails[0]}`);
            }
          }
          crawled++;
        } catch (err) {
          // Domain doesn't exist or timeout — move on
        }

        await sleep(500); // Firecrawl rate limiting
      }
    }

    if ((crawled % 20 === 0) || landlord === landlords[landlords.length - 1]) {
      console.log(`  Firecrawl: ${crawled} pages crawled, ${found} emails found`);
    }
  }

  console.log(`Firecrawl: ${found} emails found from ${crawled} pages crawled`);
  return { found, crawled };
}

// ============================================================
// TIER 4: Flag Direct Mail Candidates
// ============================================================

/**
 * Flag remaining no-email leads as direct mail candidates.
 * These are PRIME candidates - older landlords without digital presence.
 * @param {object} db
 * @param {object} options
 * @returns {object}
 */
function flagDirectMail(db, options = {}) {
  const { minScore = 50 } = options;

  const result = db.prepare(`
    UPDATE landlords
    SET enrichment_source = CASE
      WHEN enrichment_source IS NOT NULL AND enrichment_source != ''
        THEN enrichment_source || ',direct-mail-candidate'
      ELSE 'direct-mail-candidate'
    END
    WHERE tired_score >= ?
      AND email IS NULL
  `).run(minScore);

  const flagged = result.changes;
  console.log(`Direct Mail: ${flagged} leads flagged for direct mail -- these are PRIME candidates (older landlords, no digital presence)`);
  return { flagged };
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================

/**
 * Run enrichment tiers.
 * @param {object} db - better-sqlite3 database
 * @param {object} options
 * @param {string} [options.tier='all'] - which tier to run
 * @param {number} [options.minScore=50]
 * @param {number} [options.limit]
 * @param {boolean} [options.dryRun=false]
 * @param {Function} [options.fetchFn] - injectable fetcher for testing
 * @returns {Promise<object>} combined stats
 */
async function enrichContacts(db, options = {}) {
  const { tier = 'all', minScore = 50, limit, dryRun = false, fetchFn } = options;
  const stats = {};

  console.log(`\n=== Contact Enrichment Waterfall ===`);
  console.log(`Tier: ${tier} | Min score: ${minScore}${limit ? ` | Limit: ${limit}` : ''}${dryRun ? ' | DRY RUN' : ''}\n`);

  const tierOpts = { minScore, limit, fetchFn };

  if (tier === 'all' || tier === 'ch-search') {
    stats.chSearch = await enrichCHCompanySearch(db, tierOpts);
  }

  if (tier === 'all' || tier === 'ch-officers') {
    stats.chOfficers = await enrichCHOfficers(db, tierOpts);
  }

  if (tier === 'all' || tier === 'ch-filings') {
    stats.chFilings = await enrichCHFilings(db, tierOpts);
  }

  if (tier === 'all' || tier === 'openrent') {
    stats.openrent = await enrichOpenRent(db, tierOpts);
  }

  if (tier === 'all' || tier === 'mail-fallback') {
    stats.mailFallback = enrichMailFallback(db, tierOpts);
  }

  if (tier === 'all' || tier === 'snov') {
    stats.snov = await enrichSnov(db, { ...tierOpts, creditLimit: limit || 50 });
  }

  if (tier === 'all' || tier === 'apify') {
    stats.apify = await enrichApify(db, tierOpts);
  }

  if (tier === 'all' || tier === 'firecrawl') {
    stats.firecrawl = await enrichFirecrawl(db, tierOpts);
  }

  if (tier === 'all' || tier === 'mail-flag') {
    stats.directMail = flagDirectMail(db, tierOpts);
  }

  // Final summary
  const totalWithEmail = db.prepare('SELECT COUNT(*) as c FROM landlords WHERE tired_score >= ? AND email IS NOT NULL').get(minScore);
  const totalNoEmail = db.prepare('SELECT COUNT(*) as c FROM landlords WHERE tired_score >= ? AND email IS NULL').get(minScore);
  const totalWithAddress = db.prepare('SELECT COUNT(*) as c FROM landlords WHERE tired_score >= ? AND mailing_address IS NOT NULL').get(minScore);
  const totalWithDirectors = db.prepare('SELECT COUNT(*) as c FROM landlords WHERE tired_score >= ? AND director_names IS NOT NULL').get(minScore);

  console.log(`\n=== Enrichment Summary ===`);
  console.log(`Leads with email:     ${totalWithEmail.c}`);
  console.log(`Leads without email:  ${totalNoEmail.c}`);
  console.log(`Leads with address:   ${totalWithAddress.c}`);
  console.log(`Leads with directors: ${totalWithDirectors.c}`);

  return stats;
}

// --- CLI entry point ---
if (require.main === module) {
  const args = process.argv.slice(2);
  const parsedArgs = {};
  for (const arg of args) {
    const match = arg.match(/^--(\w[\w-]*)(?:=(.+))?$/);
    if (match) parsedArgs[match[1]] = match[2] || true;
  }

  const db = require('./lib/db');

  enrichContacts(db, {
    tier: parsedArgs.tier || 'all',
    minScore: parseInt(parsedArgs['min-score']) || 50,
    limit: parsedArgs.limit ? parseInt(parsedArgs.limit) : undefined,
    dryRun: parsedArgs['dry-run'] === true || parsedArgs['dry-run'] === 'true',
  }).catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

// --- Exports ---
module.exports = {
  enrichContacts,
  enrichCHCompanySearch,
  enrichCHOfficers,
  enrichCHFilings,
  enrichMailFallback,
  enrichOpenRent,
  enrichSnov,
  enrichApify,
  enrichFirecrawl,
  flagDirectMail,
  isServiceAddress,
  extractEmails,
  createRateLimiter,
};
