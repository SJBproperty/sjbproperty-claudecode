require('dotenv').config();
const https = require('https');
const db = require('./lib/db');
const { CH_API_BASE, PROPERTY_SIC_CODES } = require('./lib/config');

// --- Auth ---
// Companies House API key is used as username with EMPTY password (colon required)
const CH_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const AUTH = Buffer.from((CH_API_KEY || '') + ':').toString('base64');

// --- Utility ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Rate Limiter ---

/**
 * Create a rate limiter that tracks request timestamps within a sliding window.
 * @param {number} maxRequests - maximum requests allowed in the window
 * @param {number} windowMs - window duration in milliseconds
 * @returns {object} Rate limiter with recordRequest, shouldWait, getCount methods
 */
function createRateLimiter(maxRequests = 600, windowMs = 300000) {
  const timestamps = [];
  const safetyMargin = 50; // stop 50 requests before limit

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

    getCount(now) {
      if (now === undefined) now = Date.now();
      prune(now);
      return timestamps.length;
    },

    async waitIfNeeded() {
      const now = Date.now();
      prune(now);
      if (timestamps.length >= (maxRequests - safetyMargin)) {
        const oldestInWindow = timestamps[0];
        const waitMs = (oldestInWindow + windowMs) - now + 1000; // 1s buffer
        console.log(`  Rate limit: ${timestamps.length}/${maxRequests} requests in window. Waiting ${Math.ceil(waitMs / 1000)}s...`);
        await sleep(waitMs);
      }
    },
  };
}

// Global rate limiter instance
const rateLimiter = createRateLimiter(600, 300000);

// --- Pure Functions ---

/**
 * Classify Companies House company_type into our entity_type.
 * @param {string} companyType - from CH API
 * @returns {'ltd'|'llp'|'unknown'}
 */
function classifyEntityType(companyType) {
  if (!companyType) return 'unknown';

  const type = String(companyType).toLowerCase();

  switch (type) {
    case 'ltd':
    case 'plc':
    case 'private-limited-guarant-nsc':
    case 'private-limited-guarant-nsc-limited-exemption':
    case 'private-unlimited':
      return 'ltd';
    case 'llp':
      return 'llp';
    default:
      return 'unknown';
  }
}

/**
 * Format a registered_office_address object into a single string.
 * @param {object|null|undefined} addressObj
 * @returns {string}
 */
function formatAddress(addressObj) {
  if (!addressObj) return '';

  const fields = [
    addressObj.address_line_1,
    addressObj.address_line_2,
    addressObj.locality,
    addressObj.region,
    addressObj.postal_code,
    addressObj.country,
  ];

  return fields.filter(f => f != null && f !== '').join(', ');
}

/**
 * Build the CH advanced search URL.
 * @param {string} location - area name (e.g. 'Stockport', 'Manchester')
 * @param {number} startIndex
 * @returns {string}
 */
function buildSearchURL(location, startIndex = 0) {
  const params = new URLSearchParams({
    sic_codes: PROPERTY_SIC_CODES,
    location: location,
    company_status: 'active',
    size: '100',
    start_index: startIndex.toString(),
  });

  return `${CH_API_BASE}/advanced-search/companies?${params}`;
}

/**
 * Parse a company item from CH API response.
 * @param {object} item - single company from CH search results
 * @returns {object} parsed company fields
 */
function parseCompany(item) {
  return {
    company_name: item.company_name,
    company_number: item.company_number,
    company_type: item.company_type,
    registered_address: formatAddress(item.registered_office_address),
    sic_codes: (item.sic_codes || []).join(','),
  };
}

/**
 * Insert a landlord record from Companies House data.
 * Uses INSERT OR IGNORE to skip duplicates (company_number UNIQUE).
 * @param {object} database - better-sqlite3 database instance
 * @param {object} company - parsed company from parseCompany
 * @returns {boolean} true if inserted, false if ignored (duplicate)
 */
function insertLandlord(database, company) {
  const stmt = database.prepare(`
    INSERT OR IGNORE INTO landlords (name, entity_type, company_number, registered_address, sic_codes, source, source_ref, scraped_at)
    VALUES (@name, @entity_type, @company_number, @registered_address, @sic_codes, @source, @source_ref, @scraped_at)
  `);

  const result = stmt.run({
    name: company.company_name,
    entity_type: classifyEntityType(company.company_type),
    company_number: company.company_number,
    registered_address: company.registered_address,
    sic_codes: company.sic_codes,
    source: 'companies_house',
    source_ref: company.company_number,
    scraped_at: new Date().toISOString(),
  });

  return result.changes > 0;
}

// --- API Functions ---

/**
 * Make a rate-limited HTTPS GET request to Companies House API.
 * @param {string} url
 * @returns {Promise<object>} parsed JSON response
 */
async function rateLimitedFetch(url) {
  await rateLimiter.waitIfNeeded();
  rateLimiter.recordRequest();

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Authorization': `Basic ${AUTH}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse CH API response: ${e.message}`));
          }
        } else if (res.statusCode === 401) {
          reject(new Error('CH API 401 Unauthorized - check COMPANIES_HOUSE_API_KEY in .env'));
        } else if (res.statusCode === 429) {
          reject(new Error('CH API 429 Rate Limited - rate limiter failed to prevent this'));
        } else {
          reject(new Error(`CH API error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
  });
}

/**
 * Search for property companies in a location.
 * Paginates through all results automatically.
 * @param {string} location - area name
 * @returns {Promise<object[]>} array of company items
 */
async function searchPropertyCompanies(location) {
  const allItems = [];
  let startIndex = 0;

  do {
    const url = buildSearchURL(location, startIndex);
    console.log(`  Searching ${location} (start_index=${startIndex})...`);

    const result = await rateLimitedFetch(url);
    const items = result.items || [];
    const totalResults = result.total_results || 0;

    allItems.push(...items);
    startIndex += 100;

    if (startIndex >= totalResults || items.length === 0) break;
  } while (true);

  return allItems;
}

/**
 * Fetch officers for a company. Returns only active directors (no resigned_on).
 * @param {string} companyNumber
 * @returns {Promise<object[]>} array of active officer items
 */
async function getOfficers(companyNumber) {
  const url = `${CH_API_BASE}/company/${companyNumber}/officers`;

  try {
    const result = await rateLimitedFetch(url);
    const officers = result.items || [];

    // Filter to active directors only (no resigned_on date)
    return officers.filter(o => !o.resigned_on);
  } catch (err) {
    console.error(`  Warning: could not fetch officers for ${companyNumber}: ${err.message}`);
    return [];
  }
}

/**
 * Main scrape function: search locations, fetch officers, insert landlords.
 * @param {string[]} [locations] - override locations (defaults to Stockport + Manchester)
 */
async function scrapeAll(locations) {
  // CH location search is area-based, not postcode-based
  const targets = locations && locations.length > 0
    ? locations
    : ['Stockport', 'Manchester'];

  console.log(`Starting Companies House scrape for ${targets.length} locations...`);

  let totalInserted = 0;

  for (const location of targets) {
    try {
      const companies = await searchPropertyCompanies(location);
      console.log(`  ${location}: ${companies.length} property companies found`);

      let inserted = 0;
      for (const company of companies) {
        const parsed = parseCompany(company);

        // Fetch active directors for context (logged for now, valuable for Phase 3)
        const officers = await getOfficers(parsed.company_number);
        if (officers.length > 0) {
          const directorNames = officers.map(o => o.name).join('; ');
          console.log(`    ${parsed.company_name} (${parsed.company_number}): directors: ${directorNames}`);
        }

        const wasInserted = insertLandlord(db, parsed);
        if (wasInserted) inserted++;
      }

      console.log(`  ${location}: ${inserted} new landlords inserted`);
      totalInserted += inserted;
    } catch (err) {
      console.error(`  ${location}: ERROR - ${err.message}`);
    }
  }

  console.log(`\nDone. ${totalInserted} total landlords inserted.`);
}

// --- CLI entry point ---
if (require.main === module) {
  const args = process.argv.slice(2);
  scrapeAll(args.length > 0 ? args : undefined).catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

// --- Exports for testing ---
module.exports = {
  classifyEntityType,
  formatAddress,
  buildSearchURL,
  parseCompany,
  insertLandlord,
  createRateLimiter,
  searchPropertyCompanies,
  getOfficers,
};
