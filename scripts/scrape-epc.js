/**
 * Playwright fallback EPC scraper
 *
 * Fallback scraper for when the EPC Register API is unavailable or rate-limited.
 * Uses playwright-cli to navigate the EPC website and extract property data.
 *
 * Usage: node scripts/scrape-epc.js [postcode1] [postcode2] ...
 * If no postcodes provided, uses all postcodes from config.
 *
 * Source provenance: 'epc_scraper' (distinct from 'epc_api')
 */

require('dotenv').config();
const { execSync } = require('child_process');
const db = require('./lib/db');
const { POSTCODES } = require('./lib/config');

const EPC_SEARCH_URL = 'https://epc.opendatacommunities.org/';

/**
 * Sleep for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run a playwright-cli command and return stdout.
 * @param {string} cmd - the command after 'playwright-cli '
 * @returns {string} stdout
 */
function playwrightCmd(cmd) {
  try {
    return execSync(`playwright-cli ${cmd}`, {
      encoding: 'utf8',
      timeout: 60000,
    });
  } catch (err) {
    console.error(`Playwright command failed: playwright-cli ${cmd}`);
    console.error(err.message);
    return '';
  }
}

/**
 * Insert parsed property rows into the database using INSERT OR IGNORE.
 * Same pattern as epc-api.js but with source='epc_scraper'.
 * @param {Array} rows - parsed rows with underscored keys
 * @returns {number} number of rows actually inserted
 */
function insertProperties(rows) {
  const scraped_at = new Date().toISOString();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO properties
      (uprn, address, postcode, current_energy_rating, property_type, tenure, transaction_type, lodgement_date, certificate_number, source, scraped_at)
    VALUES
      (@uprn, @address, @postcode, @current_energy_rating, @property_type, @tenure, @transaction_type, @lodgement_date, @certificate_number, @source, @scraped_at)
  `);

  let inserted = 0;
  const runAll = db.transaction((items) => {
    for (const row of items) {
      const result = insert.run({
        uprn: row.uprn || null,
        address: row.address || '',
        postcode: row.postcode || '',
        current_energy_rating: row.current_energy_rating || null,
        property_type: row.property_type || null,
        tenure: row.tenure || null,
        transaction_type: row.transaction_type || null,
        lodgement_date: row.lodgement_date || null,
        certificate_number: row.certificate_number || null,
        source: 'epc_scraper',
        scraped_at: scraped_at,
      });
      if (result.changes > 0) inserted++;
    }
  });

  runAll(rows);
  return inserted;
}

/**
 * Parse a snapshot YAML to extract property rows from the EPC search results table.
 * The web interface returns a table with columns for address, EPC rating, etc.
 * @param {string} snapshot - YAML snapshot text from playwright-cli
 * @param {string} postcode - the postcode being searched
 * @returns {Array} parsed property rows
 */
function parseSnapshot(snapshot, postcode) {
  const rows = [];

  // The EPC website results page shows properties in a table/list format
  // We parse the snapshot text for property entries
  // Each result typically shows: address, current rating, potential rating, certificate date

  // Look for lines that contain EPC rating patterns (single letters A-G)
  // and address-like patterns
  const lines = snapshot.split('\n');
  let currentAddress = null;
  let currentRating = null;
  let currentCertDate = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Look for address lines (usually contain a street number and postcode area)
    if (trimmed.match(/^\d+\s+\w+/) && !trimmed.match(/^(Page|Results|Showing)/i)) {
      // Could be an address
      if (currentAddress && currentRating) {
        // Save previous entry
        rows.push({
          address: currentAddress,
          postcode: postcode,
          uprn: null,
          current_energy_rating: currentRating,
          property_type: null,
          tenure: 'Rented (private)', // Assumed from search filters
          transaction_type: null,
          lodgement_date: currentCertDate,
          certificate_number: null,
        });
      }
      currentAddress = trimmed;
      currentRating = null;
      currentCertDate = null;
    }

    // Look for EPC rating (single letter D-G in context)
    const ratingMatch = trimmed.match(/\b([D-G])\b/);
    if (ratingMatch && currentAddress && !currentRating) {
      currentRating = ratingMatch[1];
    }

    // Look for date patterns (YYYY-MM-DD or DD/MM/YYYY)
    const dateMatch = trimmed.match(/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch && currentAddress) {
      let date = dateMatch[1];
      // Convert DD/MM/YYYY to YYYY-MM-DD
      if (date.includes('/')) {
        const parts = date.split('/');
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      currentCertDate = date;
    }
  }

  // Don't forget the last entry
  if (currentAddress && currentRating) {
    rows.push({
      address: currentAddress,
      postcode: postcode,
      uprn: null,
      current_energy_rating: currentRating,
      property_type: null,
      tenure: 'Rented (private)',
      transaction_type: null,
      lodgement_date: currentCertDate,
      certificate_number: null,
    });
  }

  return rows;
}

/**
 * Scrape EPC data for a single postcode using playwright-cli.
 * @param {string} postcode
 * @returns {Promise<number>} number of properties inserted
 */
async function scrapePostcode(postcode) {
  console.log(`  ${postcode}: navigating to EPC search...`);

  // Navigate to EPC search page
  playwrightCmd(`goto "${EPC_SEARCH_URL}"`);
  await sleep(2000);

  // Take a snapshot to understand the page structure
  let snapshot = playwrightCmd('snapshot');

  // Try to find and fill the postcode search field
  // The EPC website has a domestic certificate search form
  playwrightCmd(`goto "https://epc.opendatacommunities.org/domestic/search?postcode=${encodeURIComponent(postcode)}&energy-band=d&energy-band=e&energy-band=f&energy-band=g"`);
  await sleep(3000);

  // Take snapshot of results
  snapshot = playwrightCmd('snapshot');

  if (!snapshot || snapshot.trim() === '') {
    console.error(`  ${postcode}: empty snapshot, skipping`);
    return 0;
  }

  // Parse results from the snapshot
  const properties = parseSnapshot(snapshot, postcode);

  // Filter to D-G ratings only (should already be filtered by URL params, but double-check)
  const filtered = properties.filter(p =>
    p.current_energy_rating && ['D', 'E', 'F', 'G'].includes(p.current_energy_rating)
  );

  if (filtered.length === 0) {
    console.log(`  ${postcode}: no D-G rated properties found in page results`);
    return 0;
  }

  // Insert into database
  const count = insertProperties(filtered);
  console.log(`  ${postcode}: ${count} properties inserted (${filtered.length} found on page)`);
  return count;
}

/**
 * Scrape all target postcodes using Playwright fallback.
 * @param {string[]} [postcodes] - override postcode list
 */
async function scrapeAll(postcodes) {
  const targets = postcodes && postcodes.length > 0 ? postcodes : POSTCODES;

  console.log(`Starting Playwright EPC scrape for ${targets.length} postcodes...`);
  console.log('NOTE: This is a fallback scraper. Prefer epc-api.js when the API is available.');

  // Open browser
  playwrightCmd('open');
  await sleep(2000);

  let totalInserted = 0;

  for (const postcode of targets) {
    try {
      const count = await scrapePostcode(postcode);
      totalInserted += count;
    } catch (err) {
      console.error(`  ${postcode}: ERROR - ${err.message}`);
    }

    // Rate limiting courtesy
    await sleep(2000);
  }

  // Close browser
  playwrightCmd('close');

  console.log(`\nDone. ${totalInserted} total properties inserted via Playwright scraper.`);
}

// --- CLI entry point ---
if (require.main === module) {
  const args = process.argv.slice(2);
  scrapeAll(args).catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  insertProperties,
  parseSnapshot,
  scrapePostcode,
  scrapeAll,
};
