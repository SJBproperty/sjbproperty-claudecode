/**
 * HMO Register CSV/XLSX Parser
 *
 * Parses HMO register files from various councils with flexible column mapping.
 * Inserts landlords and properties into the database.
 *
 * Usage: node parse-hmo.js <file> [council-name]
 *   file: path to CSV or XLSX file
 *   council-name: optional, defaults to filename stem
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse: parseCsvSync } = require('csv-parse/sync');
const XLSX = require('xlsx');
const { POSTCODES } = require('./lib/config');
const { normaliseAddress, normaliseName, extractPostcodeOutcode } = require('./lib/normalise');

// Column mappings per council — each field has an array of possible header names
const COLUMN_MAPS = {
  stockport: {
    name: ['Name & address of licence holder', 'Licence Holder', 'Landlord Name', 'Licence Holder Name'],
    address: ['Address of licenced HMO', 'Address', 'Property Address', 'Address of HMO'],
    postcode: ['Post code', 'Postcode', 'Post Code', 'Property Postcode'],
    licence: ['Licence Ref.', 'Licence Number', 'HMO Licence', 'Licence No', 'License Number'],
  },
  manchester: {
    name: ['Licence Holder Name', 'Licence Holder', 'Landlord Name', 'Applicant Name'],
    address: ['premises address', 'Address', 'Property Address', 'HMO Address'],
    postcode: ['Postcode', 'Post Code', 'Property Postcode'],
    licence: ['Licence Number', 'HMO Licence', 'Licence Ref'],
  },
  _default: {
    name: ['Name & address of licence holder', 'Licence Holder Name', 'Licence Holder', 'Landlord Name', 'Applicant Name', 'Name'],
    address: ['Address of licenced HMO', 'premises address', 'Address', 'Property Address', 'HMO Address', 'Address of HMO'],
    postcode: ['Post code', 'Postcode', 'Post Code', 'Property Postcode'],
    licence: ['Licence Ref.', 'Licence Number', 'HMO Licence', 'Licence No', 'License Number', 'Licence Ref'],
  },
};

// UK postcode regex
const POSTCODE_REGEX = /([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i;

/**
 * Split a combined "Name & address of licence holder" field into name and address parts.
 * Format: "Mr Simon Farrell 22a Crossefield Road, Cheadle, SK8 5PE"
 * Strategy: find the first house number pattern and split there.
 */
function splitNameAndAddress(combined) {
  if (!combined || combined.trim() === '') return { name: '', address: '' };

  const trimmed = combined.trim();

  // Find the first house number pattern (digits possibly followed by a letter, then space)
  const houseNumMatch = trimmed.match(/(\d+[a-z]?\s)/i);
  if (houseNumMatch) {
    const splitIdx = trimmed.indexOf(houseNumMatch[0]);
    if (splitIdx > 0) {
      const namePart = trimmed.substring(0, splitIdx).trim();
      const addressPart = trimmed.substring(splitIdx).trim();
      if (namePart.length > 0) {
        return { name: namePart, address: addressPart };
      }
    }
  }

  // Fallback: take first 2-3 words as name
  const words = trimmed.split(/\s+/);
  if (words.length >= 3) {
    // Check if word 3 looks like a title/name word (not a number)
    const nameWords = /^\d/.test(words[2]) ? 2 : 3;
    return {
      name: words.slice(0, nameWords).join(' '),
      address: words.slice(nameWords).join(' '),
    };
  }

  return { name: trimmed, address: '' };
}

/**
 * Extract postcode from an address string (used when no standalone postcode column exists).
 */
function extractPostcodeFromAddress(address) {
  if (!address) return '';
  const match = address.match(POSTCODE_REGEX);
  return match ? match[1].trim() : '';
}

/**
 * Resolve column mapping: for each field, find the first matching header.
 * Tries council-specific mapping first, then falls back to _default.
 */
function resolveMapping(headers, councilName) {
  const councilMap = COLUMN_MAPS[councilName] || null;
  const defaultMap = COLUMN_MAPS._default;

  const resolved = {};
  const requiredFields = ['name', 'address'];
  const allFields = ['name', 'address', 'postcode', 'licence'];

  for (const field of allFields) {
    let found = null;

    // Try council-specific mapping first
    if (councilMap && councilMap[field]) {
      for (const candidate of councilMap[field]) {
        if (headers.includes(candidate)) {
          found = candidate;
          break;
        }
      }
    }

    // Fall back to _default mapping
    if (!found) {
      for (const candidate of defaultMap[field]) {
        if (headers.includes(candidate)) {
          found = candidate;
          break;
        }
      }
    }

    resolved[field] = found;
  }

  // Check required fields
  const missing = requiredFields.filter(f => !resolved[f]);
  if (missing.length > 0) {
    const expectedCols = missing.map(f => {
      const candidates = councilMap && councilMap[f]
        ? [...new Set([...councilMap[f], ...defaultMap[f]])]
        : defaultMap[f];
      return `${f}: [${candidates.join(', ')}]`;
    }).join('; ');
    throw new Error(`Cannot map required columns. Found headers: [${headers.join(', ')}]. Expected one of: ${expectedCols}`);
  }

  return resolved;
}

/**
 * Read rows from a CSV file, returning array of objects keyed by header.
 */
function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseCsvSync(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

/**
 * Read rows from an XLSX/XLS file, returning array of objects keyed by header.
 */
function readXlsx(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet);
}

/**
 * Parse an HMO register file (CSV or XLSX) and insert into database.
 *
 * @param {string} filePath - Path to CSV or XLSX file
 * @param {string} councilName - Council name (e.g. 'stockport', 'manchester')
 * @param {object} db - better-sqlite3 database instance
 * @returns {{ imported: number, skipped: number, total: number, mapping: object }}
 */
function parseHmo(filePath, councilName, db) {
  const ext = path.extname(filePath).toLowerCase();

  // Read rows based on file type
  let rows;
  if (ext === '.csv') {
    rows = readCsv(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    rows = readXlsx(filePath);
  } else {
    throw new Error(`Unsupported file type: ${ext}. Expected .csv, .xlsx, or .xls`);
  }

  if (rows.length === 0) {
    return { imported: 0, skipped: 0, total: 0, mapping: {} };
  }

  // Resolve column mapping from headers
  const headers = Object.keys(rows[0]);
  const mapping = resolveMapping(headers, councilName);

  console.log(`HMO column mapping (${councilName}): ${JSON.stringify(mapping)}`);

  // Prepare statements
  const upsertLandlord = db.prepare(`
    INSERT OR IGNORE INTO landlords (name, entity_type, source, source_ref, hmo_licence_number, scraped_at)
    VALUES (?, 'unknown', 'hmo-register', ?, ?, datetime('now'))
  `);

  const getLandlordId = db.prepare(`
    SELECT id FROM landlords WHERE name = ? AND source = 'hmo-register' AND source_ref = ?
  `);

  const insertProperty = db.prepare(`
    INSERT OR IGNORE INTO properties (landlord_id, address, postcode, hmo_licence_number, source, source_ref, scraped_at)
    VALUES (?, ?, ?, ?, 'hmo-register', ?, datetime('now'))
  `);

  let imported = 0;
  let skipped = 0;

  // Process in transaction batches of 500
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const txn = db.transaction((batchRows) => {
      for (const row of batchRows) {
        let name = row[mapping.name] || '';
        let address = row[mapping.address] || '';
        let postcode = mapping.postcode ? (row[mapping.postcode] || '') : '';
        const licence = mapping.licence ? (row[mapping.licence] || '') : '';

        // Special handling: Stockport "Name & address of licence holder" combined field
        if (mapping.name === 'Name & address of licence holder' && name) {
          const parts = splitNameAndAddress(name);
          name = parts.name;
          // Don't overwrite address from the dedicated address column
        }

        // Special handling: no standalone postcode column — extract from address
        if (!postcode && address) {
          postcode = extractPostcodeFromAddress(address);
        }

        // Filter by postcode
        const outcode = extractPostcodeOutcode(postcode);
        if (!outcode || !POSTCODES.includes(outcode)) {
          skipped++;
          continue;
        }

        // Upsert landlord
        const normName = normaliseName(name);
        if (normName) {
          upsertLandlord.run(normName, councilName, licence || null);
        }

        // Get landlord ID
        const landlordRow = normName ? getLandlordId.get(normName, councilName) : null;
        const landlordId = landlordRow ? landlordRow.id : null;

        // Insert property
        insertProperty.run(landlordId, address, postcode, licence || null, councilName);

        imported++;
      }
    });

    txn(batch);
  }

  const total = imported + skipped;
  console.log(`HMO import (${councilName}): ${imported} imported, ${skipped} skipped, ${total} total`);

  return { imported, skipped, total, mapping };
}

// Run directly if called as a script
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node parse-hmo.js <file> [council-name]');
    process.exit(1);
  }

  const councilName = process.argv[3] || path.basename(filePath, path.extname(filePath)).toLowerCase();
  const db = require('./lib/db');

  // Run Phase 2 migration to ensure columns exist
  const { runMigration } = require('./migrate-phase2');
  runMigration(db);

  parseHmo(filePath, councilName, db);
}

module.exports = { parseHmo };
