/**
 * Rightmove/Zoopla Apify Result Processor
 *
 * Processes JSON output from Rightmove/Zoopla Apify Actor runs.
 * Inserts properties into the database with void period analysis and listing quality scoring.
 * This script does NOT invoke Apify Actors — it processes saved JSON output.
 *
 * Usage: node process-rightmove.js <results.json>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { POSTCODES } = require('./lib/config');
const { extractPostcodeOutcode } = require('./lib/normalise');

/**
 * Extract postcode from a result object.
 * Tries explicit postcode field first, then parses from address.
 */
function extractPostcode(result) {
  if (result.postcode) return result.postcode.trim();

  const address = result.address || result.displayAddress || result.propertyAddress || '';
  const match = address.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/i);
  return match ? match[1].trim() : '';
}

/**
 * Calculate void days from a listing date.
 * Longer listing = longer void period.
 * If no date or future date, returns 0.
 */
function calculateVoidDays(dateStr) {
  if (!dateStr) return 0;
  const listDate = new Date(dateStr);
  if (isNaN(listDate.getTime())) return 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  listDate.setHours(0, 0, 0, 0);

  if (listDate >= now) return 0;

  const diffMs = now.getTime() - listDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate listing quality score (0-100) based on listing content.
 *
 * Breakdown:
 *   Photo count:       0-40 points (0=0, 1-3=10, 4-7=20, 8-15=30, 16+=40)
 *   Description length: 0-30 points (0-100=0, 101-300=10, 301-700=20, 701+=30)
 *   Has floorplan:     0-15 points (yes=15, no=0)
 *   Has EPC:           0-15 points (yes=15, no=0)
 */
function calculateListingQualityScore(result) {
  let score = 0;

  // Photo count scoring
  const photoCount = (result.images && result.images.length) ||
    (result.photos && result.photos.length) || 0;
  if (photoCount >= 16) score += 40;
  else if (photoCount >= 8) score += 30;
  else if (photoCount >= 4) score += 20;
  else if (photoCount >= 1) score += 10;

  // Description length scoring
  const descLength = (result.description || '').length;
  if (descLength >= 701) score += 30;
  else if (descLength >= 301) score += 20;
  else if (descLength >= 101) score += 10;

  // Floorplan presence
  if (result.floorplan || result.floorplanUrl) score += 15;

  // EPC presence
  if (result.epc || result.epcRating) score += 15;

  return score;
}

/**
 * Process Rightmove/Zoopla Apify results JSON file and insert into database.
 *
 * @param {string} filePath - Path to JSON file containing Apify results
 * @param {object} db - better-sqlite3 database instance
 * @returns {{ imported: number, skipped: number }}
 */
function processRightmove(filePath, db) {
  const rawData = fs.readFileSync(filePath, 'utf8');
  const results = JSON.parse(rawData);

  if (!Array.isArray(results) || results.length === 0) {
    console.log('Rightmove import: no results to process');
    return { imported: 0, skipped: 0 };
  }

  // Determine source from --source flag or default to 'rightmove'
  const sourceArg = process.argv.find(a => a.startsWith('--source='));
  const source = sourceArg ? sourceArg.split('=')[1] : 'rightmove';

  // Prepare statement — no landlord record for Rightmove/Zoopla (agents, not landlords)
  const insertProperty = db.prepare(`
    INSERT OR IGNORE INTO properties (address, postcode, listing_url, void_days, listing_quality_score, source, source_ref, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let imported = 0;
  let skipped = 0;

  // Process in transaction batches of 100
  const batchSize = 100;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);

    const txn = db.transaction((batchResults) => {
      for (const result of batchResults) {
        // Extract fields with fallback alternatives
        const address = result.address || result.displayAddress || result.propertyAddress || '';
        const postcode = extractPostcode(result);
        const listingUrl = result.url || result.propertyUrl || '';
        const listingDate = result.listingDate || result.firstPublished || result.publishedDate || null;

        // Filter by postcode — handle both full postcodes and outcode-only values
        let outcode = extractPostcodeOutcode(postcode);
        if (!outcode) {
          const outcodeMatch = postcode.match(/^([A-Z]{1,2}\d[A-Z\d]?)$/i);
          if (outcodeMatch) outcode = outcodeMatch[1].toUpperCase();
        }
        if (!outcode || !POSTCODES.includes(outcode)) {
          skipped++;
          continue;
        }

        // Calculate metrics
        const voidDays = calculateVoidDays(listingDate);
        const qualityScore = calculateListingQualityScore(result);

        // Insert property
        insertProperty.run(address, postcode, listingUrl || null, voidDays, qualityScore, source, source);
        imported++;
      }
    });

    txn(batch);
  }

  console.log(`${source} import: ${imported} properties, ${skipped} skipped`);

  return { imported, skipped };
}

// Run directly if called as a script
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node process-rightmove.js <results.json>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const db = require('./lib/db');
  const { runMigration } = require('./migrate-phase2');
  runMigration(db);

  processRightmove(filePath, db);
}

module.exports = { processRightmove };
