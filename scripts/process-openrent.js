/**
 * OpenRent Apify Result Processor
 *
 * Processes JSON output from OpenRent Apify Actor runs.
 * Inserts landlords and properties into the database.
 * This script does NOT invoke Apify Actors — it processes saved JSON output.
 *
 * Usage: node process-openrent.js <results.json>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { POSTCODES } = require('./lib/config');
const { normaliseName, extractPostcodeOutcode } = require('./lib/normalise');

/**
 * Extract postcode from an address string (last word matching UK postcode pattern).
 * Falls back to explicit postcode field.
 */
function extractPostcode(result) {
  if (result.postcode) return result.postcode.trim();

  const address = result.address || result.propertyAddress || result.title || '';
  // Try full postcode first (e.g., "SK1 3AA")
  const fullMatch = address.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/i);
  if (fullMatch) return fullMatch[1].trim();
  // Fall back to outcode-only at end of address (e.g., "Stockport SK1")
  const outcodeMatch = address.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*$/i);
  return outcodeMatch ? outcodeMatch[1].trim() : '';
}

/**
 * Calculate void days from an available date.
 * If the date is in the past, returns days between then and now.
 * If future or null, returns 0.
 */
function calculateVoidDays(dateStr) {
  if (!dateStr) return 0;
  const availDate = new Date(dateStr);
  if (isNaN(availDate.getTime())) return 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  availDate.setHours(0, 0, 0, 0);

  if (availDate >= now) return 0;

  const diffMs = now.getTime() - availDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Process OpenRent Apify results JSON file and insert into database.
 *
 * @param {string} filePath - Path to JSON file containing Apify results
 * @param {object} db - better-sqlite3 database instance
 * @returns {{ imported: number, skipped: number, landlords: number }}
 */
function processOpenRent(filePath, db) {
  const rawData = fs.readFileSync(filePath, 'utf8');
  const results = JSON.parse(rawData);

  if (!Array.isArray(results) || results.length === 0) {
    console.log('OpenRent import: no results to process');
    return { imported: 0, skipped: 0, landlords: 0 };
  }

  // Prepare statements
  const upsertLandlord = db.prepare(`
    INSERT OR IGNORE INTO landlords (name, entity_type, source, source_ref, scraped_at)
    VALUES (?, 'individual', 'openrent', ?, datetime('now'))
  `);

  const getLandlordId = db.prepare(`
    SELECT id FROM landlords WHERE name = ? AND source = 'openrent'
  `);

  const insertProperty = db.prepare(`
    INSERT OR IGNORE INTO properties (landlord_id, address, postcode, listing_url, void_days, source, source_ref, scraped_at)
    VALUES (?, ?, ?, ?, ?, 'openrent', ?, datetime('now'))
  `);

  let imported = 0;
  let skipped = 0;
  let landlordCount = 0;

  // Process in transaction batches of 100
  const batchSize = 100;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);

    const txn = db.transaction((batchResults) => {
      for (const result of batchResults) {
        // Extract fields with fallback alternatives
        const address = result.address || result.propertyAddress || result.title || '';
        const postcode = extractPostcode(result);
        const landlordName = result.landlordName || result.agentName || result.lettingAgent || '';
        const agentName = result.agentName || '';
        const listingUrl = result.url || result.listingUrl || '';
        const availableDate = result.availableDate || result.availableFrom || null;

        // Determine self-managing status
        const isSelfManaging = (landlordName && !agentName) ||
          landlordName.toLowerCase().includes('private landlord');

        // Filter by postcode — handle both full postcodes and outcode-only values
        let outcode = extractPostcodeOutcode(postcode);
        if (!outcode) {
          // Actor may return outcode-only (e.g., "M14" instead of "M14 5RB")
          const outcodeMatch = postcode.match(/^([A-Z]{1,2}\d[A-Z\d]?)$/i);
          if (outcodeMatch) outcode = outcodeMatch[1].toUpperCase();
        }
        if (!outcode || !POSTCODES.includes(outcode)) {
          skipped++;
          continue;
        }

        // Calculate void days
        const voidDays = calculateVoidDays(availableDate);

        // Source ref includes self-managing indicator
        const sourceRef = isSelfManaging ? 'self-managing' : 'agent-managed';

        // Upsert landlord if name exists
        let landlordId = null;
        const normName = normaliseName(landlordName);
        if (normName) {
          upsertLandlord.run(normName, sourceRef);
          const landlordRow = getLandlordId.get(normName);
          if (landlordRow) {
            landlordId = landlordRow.id;
            landlordCount++;
          }
        }

        // Insert property
        insertProperty.run(landlordId, address, postcode, listingUrl || null, voidDays, sourceRef);
        imported++;
      }
    });

    txn(batch);
  }

  console.log(`OpenRent import: ${imported} properties, ${landlordCount} landlords, ${skipped} skipped`);

  return { imported, skipped, landlords: landlordCount };
}

// Run directly if called as a script
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node process-openrent.js <results.json>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const db = require('./lib/db');
  const { runMigration } = require('./migrate-phase2');
  runMigration(db);

  processOpenRent(filePath, db);
}

module.exports = { processOpenRent };
