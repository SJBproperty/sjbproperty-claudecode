/**
 * Land Registry CCOD (UK Companies Owning Property) CSV streaming importer.
 *
 * Streams the ~500MB CCOD CSV, filters to target postcodes (SK1-SK8, M14, M19-M22),
 * and upserts landlord + property records with source provenance.
 *
 * Usage:
 *   node scripts/import-ccod.js [path/to/CCOD_FULL.csv]
 *
 * Download CCOD from: https://use-land-property-data.service.gov.uk/datasets/ccod
 */

require('dotenv').config();
const fs = require('fs');
const { parse } = require('csv-parse');
const { POSTCODES, CCOD_PATH } = require('./lib/config');
const { normaliseAddress, normaliseName, extractPostcodeOutcode } = require('./lib/normalise');
const { runMigration } = require('./migrate-phase2');

/**
 * Map CCOD proprietorship category to entity_type.
 */
function categoryToEntityType(category) {
  if (!category) return 'unknown';
  const cat = category.trim().toLowerCase();
  if (cat === 'corporate body') return 'ltd';
  if (cat === 'limited liability partnership') return 'llp';
  if (cat === 'individual(s)') return 'individual';
  return 'unknown';
}

/**
 * Import CCOD CSV into the database.
 *
 * @param {string} filePath - Path to the CCOD CSV file
 * @param {import('better-sqlite3').Database} db - Database instance
 * @returns {Promise<{total: number, imported: number, skipped: number}>}
 */
async function importCcod(filePath, db) {
  // Ensure Phase 2 schema is up to date
  runMigration(db);

  const now = new Date().toISOString();

  // Prepare statements
  const insertLandlord = db.prepare(`
    INSERT OR IGNORE INTO landlords (name, entity_type, company_number, registered_address, source, source_ref, scraped_at, ccod_title_numbers)
    VALUES (@name, @entity_type, @company_number, @registered_address, 'ccod', @source_ref, @scraped_at, @ccod_title_numbers)
  `);

  const getLandlordByCompany = db.prepare(`
    SELECT id, ccod_title_numbers FROM landlords WHERE company_number = ?
  `);

  const getLandlordByName = db.prepare(`
    SELECT id, ccod_title_numbers FROM landlords WHERE name = ? AND source = 'ccod' AND company_number IS NULL
  `);

  const updateTitleNumbers = db.prepare(`
    UPDATE landlords SET ccod_title_numbers = ? WHERE id = ?
  `);

  const insertProperty = db.prepare(`
    INSERT OR IGNORE INTO properties (landlord_id, address, postcode, title_number, tenure, source, source_ref, scraped_at)
    VALUES (@landlord_id, @address, @postcode, @title_number, @tenure, 'ccod', @source_ref, @scraped_at)
  `);

  let total = 0;
  let imported = 0;
  let skipped = 0;

  return new Promise((resolve, reject) => {
    const parser = fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }));

    // Batch buffer
    let batch = [];
    const BATCH_SIZE = 1000;

    function processBatch(rows) {
      const txn = db.transaction(() => {
        for (const row of rows) {
          processRow(row);
        }
      });
      txn();
    }

    function processRow(row) {
      const titleNumber = row['Title Number'] || '';
      const tenure = row['Tenure'] || '';
      const address = row['Property Address'] || '';
      const postcode = (row['Postcode'] || '').trim();
      const proprietorName = row['Proprietor Name (1)'] || '';
      const companyRegNo = (row['Company Registration No (1)'] || '').trim();
      const category = row['Proprietorship Category (1)'] || '';
      const proprietorAddress = row['Proprietor (1) Address (1)'] || '';
      const dateAdded = row['Date Proprietor Added'] || '';

      // Extract outcode and filter
      const outcode = extractPostcodeOutcode(postcode);
      if (!outcode || !POSTCODES.includes(outcode)) {
        skipped++;
        return;
      }

      const normName = normaliseName(proprietorName);
      const entityType = categoryToEntityType(category);
      let landlordId;

      if (companyRegNo) {
        // Try to find existing landlord by company number
        const existing = getLandlordByCompany.get(companyRegNo);
        if (existing) {
          landlordId = existing.id;
          // Append title number to existing array
          const titles = existing.ccod_title_numbers ? JSON.parse(existing.ccod_title_numbers) : [];
          if (!titles.includes(titleNumber)) {
            titles.push(titleNumber);
            updateTitleNumbers.run(JSON.stringify(titles), landlordId);
          }
        } else {
          // Insert new landlord
          const result = insertLandlord.run({
            name: normName,
            entity_type: entityType,
            company_number: companyRegNo,
            registered_address: proprietorAddress,
            source_ref: dateAdded,
            scraped_at: now,
            ccod_title_numbers: JSON.stringify([titleNumber]),
          });
          landlordId = result.lastInsertRowid;
        }
      } else {
        // No company number — match by normalised name
        const existing = getLandlordByName.get(normName);
        if (existing) {
          landlordId = existing.id;
          const titles = existing.ccod_title_numbers ? JSON.parse(existing.ccod_title_numbers) : [];
          if (!titles.includes(titleNumber)) {
            titles.push(titleNumber);
            updateTitleNumbers.run(JSON.stringify(titles), landlordId);
          }
        } else {
          const result = insertLandlord.run({
            name: normName,
            entity_type: entityType,
            company_number: null,
            registered_address: proprietorAddress,
            source_ref: dateAdded,
            scraped_at: now,
            ccod_title_numbers: JSON.stringify([titleNumber]),
          });
          landlordId = result.lastInsertRowid;
        }
      }

      // Insert property
      insertProperty.run({
        landlord_id: landlordId,
        address: normaliseAddress(address),
        postcode: postcode,
        title_number: titleNumber,
        tenure: tenure,
        source_ref: dateAdded,
        scraped_at: now,
      });

      imported++;
    }

    parser.on('data', (row) => {
      total++;
      batch.push(row);

      if (batch.length >= BATCH_SIZE) {
        processBatch(batch);
        batch = [];
      }

      if (total % 100000 === 0) {
        console.log(`${total} rows processed, ${imported} imported, ${skipped} skipped`);
      }
    });

    parser.on('error', (err) => {
      reject(err);
    });

    parser.on('end', () => {
      // Process remaining batch
      if (batch.length > 0) {
        processBatch(batch);
      }
      console.log(`CCOD import complete: ${total} processed, ${imported} imported, ${skipped} skipped (not in target postcodes)`);
      resolve({ total, imported, skipped });
    });
  });
}

// Run directly if called as a script
if (require.main === module) {
  const filePath = process.argv[2] || CCOD_PATH;

  if (!fs.existsSync(filePath)) {
    console.error(`CCOD file not found at ${filePath}. Download from https://use-land-property-data.service.gov.uk/datasets/ccod`);
    process.exit(1);
  }

  const db = require('./lib/db');
  importCcod(filePath, db)
    .then((result) => {
      console.log(`Done. ${result.imported} landlord/property records imported.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('CCOD import failed:', err);
      process.exit(1);
    });
}

module.exports = { importCcod };
