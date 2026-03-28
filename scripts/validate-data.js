#!/usr/bin/env node
/**
 * Data Validation Script
 *
 * Checks database health by verifying row counts per source
 * across properties and landlords tables.
 *
 * Usage:
 *   node validate-data.js          # Full validation with row counts
 *   node validate-data.js --check  # Quick mode: DB connectivity + table existence only
 *
 * Exit codes:
 *   0 - All checks passed (or warnings only)
 *   1 - Critical failure (DB not accessible, tables missing)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { DB_PATH, EXPORTS_DIR } = require('./lib/config');

// Expected sources per table
const EXPECTED_PROPERTY_SOURCES = ['epc_api', 'hmo-register', 'ccod', 'openrent', 'rightmove', 'zoopla'];
const EXPECTED_LANDLORD_SOURCES = ['companies_house', 'hmo-register', 'ccod', 'openrent'];

function main() {
  const quickMode = process.argv.includes('--check');

  // Check DB file exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`FAIL: Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  // Connect to DB
  let db;
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH, { readonly: true });
  } catch (err) {
    console.error(`FAIL: Cannot open database: ${err.message}`);
    process.exit(1);
  }

  // Check tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  const requiredTables = ['properties', 'landlords'];
  const missingTables = requiredTables.filter(t => !tables.includes(t));

  if (missingTables.length > 0) {
    console.error(`FAIL: Missing tables: ${missingTables.join(', ')}`);
    db.close();
    process.exit(1);
  }

  console.log('Database connectivity: OK');
  console.log(`Tables found: ${requiredTables.join(', ')}`);

  if (quickMode) {
    console.log('\n--check mode: DB connectivity and tables verified.');
    db.close();
    process.exit(0);
  }

  // Full validation: check row counts per source
  console.log('\n=== Properties Table ===');
  const propertyCounts = db.prepare(
    'SELECT source, COUNT(*) as count FROM properties GROUP BY source ORDER BY count DESC'
  ).all();

  const propertyMap = {};
  for (const row of propertyCounts) {
    propertyMap[row.source] = row.count;
    console.log(`  ${row.source}: ${row.count} rows`);
  }

  const totalProperties = db.prepare('SELECT COUNT(*) as count FROM properties').get().count;
  console.log(`  TOTAL: ${totalProperties} rows`);

  console.log('\n=== Landlords Table ===');
  const landlordCounts = db.prepare(
    'SELECT source, COUNT(*) as count FROM landlords GROUP BY source ORDER BY count DESC'
  ).all();

  const landlordMap = {};
  for (const row of landlordCounts) {
    landlordMap[row.source] = row.count;
    console.log(`  ${row.source}: ${row.count} rows`);
  }

  const totalLandlords = db.prepare('SELECT COUNT(*) as count FROM landlords').get().count;
  console.log(`  TOTAL: ${totalLandlords} rows`);

  // Check exports directory
  console.log('\n=== Exports Directory ===');
  if (fs.existsSync(EXPORTS_DIR)) {
    const csvFiles = fs.readdirSync(EXPORTS_DIR).filter(f => f.endsWith('.csv'));
    if (csvFiles.length > 0) {
      console.log(`  ${csvFiles.length} CSV file(s) found:`);
      for (const f of csvFiles) {
        const stats = fs.statSync(path.join(EXPORTS_DIR, f));
        console.log(`    ${f} (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    } else {
      console.log('  No CSV exports yet (will be created by build-lead-list.js)');
    }
  } else {
    console.log('  Exports directory does not exist yet');
  }

  // Summary with warnings
  console.log('\n=== Source Coverage ===');
  let warnings = 0;

  for (const source of EXPECTED_PROPERTY_SOURCES) {
    const count = propertyMap[source] || 0;
    if (count > 0) {
      console.log(`  [PASS] properties.${source}: ${count} rows`);
    } else {
      console.log(`  [WARN] properties.${source}: 0 rows (not yet imported)`);
      warnings++;
    }
  }

  for (const source of EXPECTED_LANDLORD_SOURCES) {
    const count = landlordMap[source] || 0;
    if (count > 0) {
      console.log(`  [PASS] landlords.${source}: ${count} rows`);
    } else {
      console.log(`  [WARN] landlords.${source}: 0 rows (not yet imported)`);
      warnings++;
    }
  }

  db.close();

  console.log(`\nResult: ${warnings} warning(s), 0 failures`);
  console.log('Validation complete.');
  process.exit(0);
}

main();

module.exports = { EXPECTED_PROPERTY_SOURCES, EXPECTED_LANDLORD_SOURCES };
