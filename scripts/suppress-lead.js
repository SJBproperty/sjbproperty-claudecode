/**
 * CLI tool for suppressing individual landlords.
 *
 * Usage: node scripts/suppress-lead.js --id 1234 --reason "Replied STOP"
 *
 * Sets suppressed=1, suppressed_date, and suppressed_reason on the landlord record.
 * Suppressed leads are excluded from ALL export outputs.
 */

/**
 * Suppress a landlord by ID.
 * @param {import('better-sqlite3').Database} db
 * @param {number} landlordId
 * @param {string} reason
 * @returns {number} Number of rows changed (0 if landlord not found)
 */
function suppressLead(db, landlordId, reason) {
  const stmt = db.prepare(`
    UPDATE landlords SET
      suppressed = 1,
      suppressed_date = ?,
      suppressed_reason = ?
    WHERE id = ?
  `);
  const result = stmt.run(new Date().toISOString(), reason, landlordId);
  return result.changes;
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse --id and --reason arguments
  let landlordId = null;
  let reason = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' && args[i + 1]) {
      landlordId = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--reason' && args[i + 1]) {
      reason = args[i + 1];
      i++;
    }
  }

  if (!landlordId || !reason) {
    console.error('Usage: node scripts/suppress-lead.js --id <landlord_id> --reason "<reason>"');
    process.exit(1);
  }

  const db = require('./lib/db');
  const changes = suppressLead(db, landlordId, reason);

  if (changes > 0) {
    console.log(`Suppressed landlord ID ${landlordId}: "${reason}"`);
  } else {
    console.log(`Landlord not found: ID ${landlordId}`);
  }
}

module.exports = { suppressLead };
