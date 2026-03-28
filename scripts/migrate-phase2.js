/**
 * Phase 2 schema migration — adds columns for CCOD, HMO, listings,
 * and deduplication match grouping.
 *
 * Idempotent: safe to run multiple times (skips "duplicate column name" errors).
 */

const MIGRATIONS = [
  'ALTER TABLE landlords ADD COLUMN hmo_licence_number TEXT',
  'ALTER TABLE landlords ADD COLUMN ccod_title_numbers TEXT',
  'ALTER TABLE properties ADD COLUMN listing_url TEXT',
  'ALTER TABLE properties ADD COLUMN void_days INTEGER',
  'ALTER TABLE properties ADD COLUMN listing_quality_score INTEGER',
  'ALTER TABLE properties ADD COLUMN hmo_licence_number TEXT',
  'ALTER TABLE properties ADD COLUMN title_number TEXT',
  'ALTER TABLE landlords ADD COLUMN match_group_id INTEGER',
  'ALTER TABLE landlords ADD COLUMN match_confidence REAL',
  'ALTER TABLE landlords ADD COLUMN is_primary_record INTEGER DEFAULT 0',
];

/**
 * Run all Phase 2 migrations on the given database instance.
 * Skips columns that already exist (duplicate column name errors).
 */
function runMigration(db) {
  for (const sql of MIGRATIONS) {
    try {
      db.exec(sql);
    } catch (err) {
      if (err.message && err.message.includes('duplicate column name')) {
        // Column already exists — skip silently (idempotent)
        continue;
      }
      throw err;
    }
  }
}

// Run directly if called as a script
if (require.main === module) {
  const db = require('./lib/db');
  runMigration(db);
  console.log('Phase 2 migration complete — 10 new columns added.');
}

module.exports = { runMigration };
