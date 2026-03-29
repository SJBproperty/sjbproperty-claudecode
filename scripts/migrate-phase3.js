/**
 * Phase 3 schema migration — adds columns for scoring, enrichment,
 * and contact information.
 *
 * Idempotent: safe to run multiple times (skips "duplicate column name" errors).
 */

const MIGRATIONS = [
  // Scoring columns
  'ALTER TABLE landlords ADD COLUMN tired_score INTEGER',
  'ALTER TABLE landlords ADD COLUMN btl_suitable INTEGER DEFAULT 0',
  'ALTER TABLE landlords ADD COLUMN r2r_suitable INTEGER DEFAULT 0',
  'ALTER TABLE landlords ADD COLUMN data_signals_count INTEGER DEFAULT 0',
  // Enrichment contact columns
  'ALTER TABLE landlords ADD COLUMN email TEXT',
  'ALTER TABLE landlords ADD COLUMN phone TEXT',
  'ALTER TABLE landlords ADD COLUMN linkedin_url TEXT',
  'ALTER TABLE landlords ADD COLUMN mailing_address TEXT',
  'ALTER TABLE landlords ADD COLUMN enrichment_source TEXT',
  'ALTER TABLE landlords ADD COLUMN enrichment_date TEXT',
  'ALTER TABLE landlords ADD COLUMN director_names TEXT',
];

/**
 * Run all Phase 3 migrations on the given database instance.
 * Skips columns that already exist (duplicate column name errors).
 */
function runMigration(db) {
  for (const sql of MIGRATIONS) {
    try {
      db.exec(sql);
    } catch (err) {
      if (err.message && err.message.includes('duplicate column name')) {
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
  console.log('Phase 3 migration complete — 11 new columns added.');
}

module.exports = { runMigration };
