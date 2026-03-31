/**
 * Shared export filter library — prevents export scripts from forgetting
 * suppression and PECR compliance checks.
 *
 * Usage:
 *   const { suppressionFilter, pecrEmailGate, getFilteredLeads } = require('./lib/export-filters');
 */

/**
 * SQL WHERE fragment for suppression filtering.
 * Add to ALL export queries.
 * @returns {string}
 */
function suppressionFilter() {
  return '(suppressed = 0 OR suppressed IS NULL)';
}

/**
 * SQL WHERE fragment for PECR entity type gate.
 * Add ONLY to email export queries.
 * Whitelist approach: only 'ltd' and 'llp' pass. Everything else excluded.
 * @returns {string}
 */
function pecrEmailGate() {
  return "entity_type IN ('ltd', 'llp')";
}

/**
 * Get filtered leads from database with suppression and optional PECR gate.
 * @param {import('better-sqlite3').Database} db
 * @param {object} options
 * @param {'email'|'mail'|'phone'|'linkedin'} options.channel - Outreach channel
 * @param {number} [options.minScore] - Optional minimum tired_score filter
 * @returns {object[]} Filtered landlord rows
 */
function getFilteredLeads(db, options = {}) {
  const { channel, minScore } = options;
  let where = `WHERE (match_group_id IS NULL OR is_primary_record = 1) AND ${suppressionFilter()}`;
  const params = [];

  if (channel === 'email') {
    where += ` AND ${pecrEmailGate()}`;
  }
  if (minScore !== undefined) {
    where += ' AND tired_score >= ?';
    params.push(minScore);
  }

  return db.prepare(`SELECT * FROM landlords ${where} ORDER BY tired_score DESC`).all(...params);
}

module.exports = { suppressionFilter, pecrEmailGate, getFilteredLeads };
