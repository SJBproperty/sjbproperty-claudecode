/**
 * Score all landlords for "tiredness" and classify as BTL-suitable
 * and/or R2R-suitable. Persists scores to the database.
 *
 * Prerequisite: run link-epc-landlords.js first to maximise EPC signal coverage.
 */

const { scoreLandlord, classifyBTL, classifyR2R } = require('./lib/scoring');
const { runMigration } = require('./migrate-phase3');

// Map numeric EPC values back to letter grades
const EPC_NUM_TO_LETTER = { 4: 'D', 5: 'E', 6: 'F', 7: 'G' };

/**
 * Score all primary/ungrouped landlords and update the database.
 * @param {import('better-sqlite3').Database} db
 * @returns {{ total: number, scored50plus: number, btlCount: number, r2rCount: number, distribution: Object }}
 */
function scoreAllLandlords(db) {
  // Ensure Phase 3 columns exist
  runMigration(db);

  // Query each primary/ungrouped landlord with aggregated property signals
  const landlords = db.prepare(`
    SELECT l.id, l.name, l.entity_type, l.source, l.hmo_licence_number,
      MAX(p.void_days) as max_void_days,
      MIN(CASE
        WHEN p.current_energy_rating = 'G' THEN 7
        WHEN p.current_energy_rating = 'F' THEN 6
        WHEN p.current_energy_rating = 'E' THEN 5
        WHEN p.current_energy_rating = 'D' THEN 4
        ELSE NULL
      END) as worst_epc_num,
      AVG(p.listing_quality_score) as avg_listing_quality,
      MAX(CASE WHEN l.source_ref LIKE '%self-managing%' THEN 1 ELSE 0 END) as is_self_managing,
      COUNT(DISTINCT p.id) as property_count,
      CASE WHEN COUNT(DISTINCT p.id) > 0
        AND COUNT(DISTINCT p.id) = COUNT(DISTINCT CASE WHEN p.hmo_licence_number IS NOT NULL THEN p.id END)
        THEN 1 ELSE 0 END as has_only_hmo
    FROM landlords l
    LEFT JOIN properties p ON p.landlord_id = l.id
    WHERE (l.match_group_id IS NULL OR l.is_primary_record = 1)
    GROUP BY l.id
  `).all();

  console.log(`Scoring ${landlords.length} landlords...`);

  const updateStmt = db.prepare(
    `UPDATE landlords SET tired_score = ?, btl_suitable = ?, r2r_suitable = ?, data_signals_count = ? WHERE id = ?`
  );

  let scored50plus = 0;
  let btlCount = 0;
  let r2rCount = 0;
  const distribution = { '0-24': 0, '25-49': 0, '50-74': 0, '75-100': 0 };

  // Prepare batch of updates
  const updates = [];

  for (const l of landlords) {
    const worstEpc = l.worst_epc_num != null ? EPC_NUM_TO_LETTER[l.worst_epc_num] : null;

    const { score, signals_count } = scoreLandlord({
      max_void_days: l.max_void_days,
      worst_epc: worstEpc,
      avg_listing_quality: l.avg_listing_quality,
      is_self_managing: l.is_self_managing === 1,
      property_count: l.property_count,
    });

    const hasHMOLicence = l.hmo_licence_number != null && l.hmo_licence_number !== '';
    const btl = classifyBTL(score, l.has_only_hmo === 1);
    const r2r = classifyR2R(hasHMOLicence);

    updates.push({
      score,
      btl: btl ? 1 : 0,
      r2r: r2r ? 1 : 0,
      signals_count,
      id: l.id,
    });

    // Track stats
    if (score >= 50) scored50plus++;
    if (btl) btlCount++;
    if (r2r) r2rCount++;

    if (score >= 75) distribution['75-100']++;
    else if (score >= 50) distribution['50-74']++;
    else if (score >= 25) distribution['25-49']++;
    else distribution['0-24']++;
  }

  // Batch update in transactions of 1000
  const batchSize = 1000;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const runBatch = db.transaction(() => {
      for (const u of batch) {
        updateStmt.run(u.score, u.btl, u.r2r, u.signals_count, u.id);
      }
    });
    runBatch();
  }

  // Log summary
  console.log(`\nScoring Summary:`);
  console.log(`  Total scored: ${landlords.length}`);
  console.log(`  Score 50+: ${scored50plus}`);
  console.log(`  BTL suitable: ${btlCount}`);
  console.log(`  R2R suitable: ${r2rCount}`);
  console.log(`\nScore Distribution:`);
  console.log(`  0-24:   ${distribution['0-24']}`);
  console.log(`  25-49:  ${distribution['25-49']}`);
  console.log(`  50-74:  ${distribution['50-74']}`);
  console.log(`  75-100: ${distribution['75-100']}`);

  return {
    total: landlords.length,
    scored50plus,
    btlCount,
    r2rCount,
    distribution,
  };
}

// Run directly if called as a script
if (require.main === module) {
  const db = require('./lib/db');
  scoreAllLandlords(db);
}

module.exports = { scoreAllLandlords };
