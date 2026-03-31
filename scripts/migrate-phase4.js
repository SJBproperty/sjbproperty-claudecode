/**
 * Phase 4 schema migration — adds columns for suppression list.
 *
 * Idempotent: safe to run multiple times (skips "duplicate column name" errors).
 */

const MIGRATIONS = [
  'ALTER TABLE landlords ADD COLUMN suppressed INTEGER DEFAULT 0',
  'ALTER TABLE landlords ADD COLUMN suppressed_date TEXT',
  'ALTER TABLE landlords ADD COLUMN suppressed_reason TEXT',
];

/**
 * Run all Phase 4 migrations on the given database instance.
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
  console.log('Phase 4 migration complete — 3 suppression columns added.');
}

module.exports = { runMigration };
