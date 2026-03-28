require('dotenv').config();
const https = require('https');
const db = require('./lib/db');
const { POSTCODES, EPC_API_BASE } = require('./lib/config');

// --- Auth ---
const EPC_EMAIL = process.env.EPC_API_EMAIL || process.env.EPC_EMAIL;
const EPC_API_KEY = process.env.EPC_API_KEY;
const AUTH = Buffer.from(`${EPC_EMAIL}:${EPC_API_KEY}`).toString('base64');

// --- Pure functions (exported for testing) ---

/**
 * Build the EPC API search URL for a given postcode and optional cursor.
 * @param {string} postcode
 * @param {string|null} searchAfter - cursor token for pagination
 * @returns {string} Full URL
 */
function buildURL(postcode, searchAfter = null) {
  const params = new URLSearchParams();
  params.set('postcode', postcode);
  // EPC API requires separate energy-band parameters for each rating
  for (const band of ['d', 'e', 'f', 'g']) {
    params.append('energy-band', band);
  }
  params.set('size', '5000');
  if (searchAfter) {
    params.set('search-after', searchAfter);
  }
  return `${EPC_API_BASE}?${params}`;
}

/**
 * Parse one row from the EPC API response, mapping hyphenated keys to underscored DB columns.
 * @param {Object} row - raw API row with hyphenated keys
 * @returns {Object} parsed row with underscored keys matching DB schema
 */
function parseEPCRow(row) {
  return {
    address: row['address'] || '',
    postcode: row['postcode'] || '',
    uprn: row['uprn'] || '',
    current_energy_rating: row['current-energy-rating'] || null,
    property_type: row['property-type'] || null,
    tenure: row['tenure'] || null,
    transaction_type: row['transaction-type'] || null,
    lodgement_date: row['lodgement-date'] || null,
    certificate_number: row['lmk-key'] || null,
  };
}

/**
 * Filter rows to only private rentals.
 * @param {Array} rows - raw API rows (hyphenated keys)
 * @returns {Array} filtered rows
 */
function filterRental(rows) {
  return rows.filter(row => row['tenure'] === 'Rented (private)');
}

/**
 * Deduplicate rows by UPRN (or address+postcode if UPRN missing), keeping the latest lodgement-date.
 * @param {Array} rows - raw API rows (hyphenated keys)
 * @returns {Array} deduplicated rows
 */
function deduplicateByUPRN(rows) {
  const groups = new Map();

  for (const row of rows) {
    const uprn = row['uprn'] || row.uprn;
    // Use UPRN as key if present and non-empty, otherwise use address+postcode
    const key = uprn && uprn.trim() !== ''
      ? uprn
      : `${row['address'] || row.address}|${row['postcode'] || row.postcode}`;

    const existing = groups.get(key);
    const rowDate = row['lodgement-date'] || '';
    const existingDate = existing ? (existing['lodgement-date'] || '') : '';

    if (!existing || rowDate > existingDate) {
      groups.set(key, row);
    }
  }

  return Array.from(groups.values());
}

/**
 * Insert parsed property rows into the database using INSERT OR IGNORE.
 * @param {Object} database - better-sqlite3 Database instance
 * @param {Array} rows - parsed rows with underscored keys
 * @returns {number} number of rows actually inserted
 */
function insertProperties(database, rows) {
  const scraped_at = new Date().toISOString();

  const insert = database.prepare(`
    INSERT OR IGNORE INTO properties
      (uprn, address, postcode, current_energy_rating, property_type, tenure, transaction_type, lodgement_date, certificate_number, source, scraped_at)
    VALUES
      (@uprn, @address, @postcode, @current_energy_rating, @property_type, @tenure, @transaction_type, @lodgement_date, @certificate_number, @source, @scraped_at)
  `);

  let inserted = 0;
  const runAll = database.transaction((items) => {
    for (const row of items) {
      const result = insert.run({
        ...row,
        source: 'epc_api',
        scraped_at: scraped_at,
      });
      if (result.changes > 0) inserted++;
    }
  });

  runAll(rows);
  return inserted;
}

// --- Network functions ---

/**
 * Sleep for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make an HTTPS GET request to the EPC API.
 * Handles HTTP errors (401, 429, 500) with retry logic.
 * @param {string} postcode
 * @param {string|null} searchAfter - cursor for pagination
 * @param {number} retries - remaining retry attempts
 * @returns {Promise<{rows: Array, nextPage: string|null}>}
 */
async function searchEPC(postcode, searchAfter = null, retries = 3) {
  const url = buildURL(postcode, searchAfter);

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${AUTH}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            const nextPage = res.headers['x-next-search-after'] || null;
            resolve({ rows: parsed.rows || [], nextPage });
          } catch (e) {
            reject(new Error(`Failed to parse EPC API response: ${e.message}`));
          }
        } else if (res.statusCode === 401) {
          reject(new Error('EPC API 401 Unauthorized - check EPC_EMAIL and EPC_API_KEY in .env'));
        } else if (res.statusCode === 429 && retries > 0) {
          console.error(`EPC API 429 Rate Limited for ${postcode}, retrying in 30s...`);
          await sleep(30000);
          resolve(searchEPC(postcode, searchAfter, retries - 1));
        } else if (res.statusCode >= 500 && retries > 0) {
          console.error(`EPC API ${res.statusCode} Server Error for ${postcode}, retrying in 10s...`);
          await sleep(10000);
          resolve(searchEPC(postcode, searchAfter, retries - 1));
        } else {
          reject(new Error(`EPC API error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
  });
}

/**
 * Scrape all target postcodes, fetching D-G rated rental properties via cursor pagination.
 * @param {string[]} [postcodes] - override postcode list (defaults to config POSTCODES)
 */
async function scrapeAll(postcodes) {
  const targets = postcodes && postcodes.length > 0 ? postcodes : POSTCODES;

  console.log(`Starting EPC API scrape for ${targets.length} postcodes...`);

  let totalInserted = 0;

  for (const postcode of targets) {
    let allRows = [];
    let cursor = null;
    let pageNum = 0;

    try {
      do {
        pageNum++;
        console.log(`  ${postcode}: fetching page ${pageNum}${cursor ? ' (cursor)' : ''}...`);
        const result = await searchEPC(postcode, cursor);
        allRows = allRows.concat(result.rows);
        cursor = result.nextPage;
      } while (cursor);

      // Filter to private rentals only
      const rentals = filterRental(allRows);
      // Deduplicate by UPRN keeping latest
      const deduped = deduplicateByUPRN(rentals);
      // Parse API fields to DB columns
      const parsed = deduped.map(parseEPCRow);
      // Insert into database
      const count = insertProperties(db, parsed);

      console.log(`  ${postcode}: ${count} rental properties (D-G rated) inserted (${allRows.length} total, ${rentals.length} rentals, ${deduped.length} unique)`);
      totalInserted += count;
    } catch (err) {
      console.error(`  ${postcode}: ERROR - ${err.message}`);
    }

    // Rate limiting courtesy - 1 second between postcodes
    await sleep(1000);
  }

  console.log(`\nDone. ${totalInserted} total properties inserted.`);
}

// --- CLI entry point ---
if (require.main === module) {
  const args = process.argv.slice(2);
  scrapeAll(args).catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

// --- Exports for testing ---
module.exports = {
  buildURL,
  parseEPCRow,
  filterRental,
  deduplicateByUPRN,
  insertProperties,
  searchEPC,
};
