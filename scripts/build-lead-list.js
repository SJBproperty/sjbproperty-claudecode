require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const { findExactMatches, findFuzzyMatches, mergeRecords } = require('./lib/dedup');

/**
 * Build the master lead list: deduplicate all landlord records and produce
 * 5 date-stamped CSV exports.
 *
 * @param {import('better-sqlite3').Database} db - Database instance
 * @param {string} exportsDir - Directory for CSV output
 * @returns {object} Summary stats
 */
function buildLeadList(db, exportsDir) {
  fs.mkdirSync(exportsDir, { recursive: true });

  // --- Step 1: Run deduplication ---
  const exactGroups = findExactMatches(db);
  const exactStats = mergeRecords(db, exactGroups);

  const { autoMerge, review } = findFuzzyMatches(db, {
    threshold: 0.3,
    autoMergeBelow: 0.2,
    rejectAbove: 0.4,
  });
  const fuzzyStats = mergeRecords(db, autoMerge);

  // --- Step 2: Generate date stamp ---
  const dateStamp = new Date().toISOString().split('T')[0];

  // --- Step 3: Export CSVs ---

  // 3a. all-leads — primary records only (or ungrouped)
  const allLeadsRows = db.prepare(`
    SELECT l.*,
      GROUP_CONCAT(DISTINCT p.postcode) as postcodes,
      GROUP_CONCAT(DISTINCT p.current_energy_rating) as epc_ratings,
      COUNT(DISTINCT p.id) as property_count
    FROM landlords l
    LEFT JOIN properties p ON p.landlord_id = l.id
    WHERE (l.match_group_id IS NULL OR l.is_primary_record = 1)
    GROUP BY l.id
  `).all();

  const allLeadsCsv = stringify(allLeadsRows.map(r => ({
    'Name': r.name,
    'Entity Type': r.entity_type,
    'Company Number': r.company_number || '',
    'Sources': r.source,
    'Property Count': r.property_count,
    'Postcodes': r.postcodes || '',
    'EPC Ratings': r.epc_ratings || '',
    'HMO Licence': r.hmo_licence_number || '',
    'Registered Address': r.registered_address || '',
  })), { header: true });

  fs.writeFileSync(path.join(exportsDir, `all-leads-${dateStamp}.csv`), allLeadsCsv);

  // 3b. high-priority-leads — identifiable name AND EPC D-G
  const highPriorityRows = db.prepare(`
    SELECT l.*,
      GROUP_CONCAT(DISTINCT p.postcode) as postcodes,
      GROUP_CONCAT(DISTINCT p.current_energy_rating) as epc_ratings,
      COUNT(DISTINCT p.id) as property_count,
      MIN(CASE
        WHEN p.current_energy_rating = 'G' THEN 7
        WHEN p.current_energy_rating = 'F' THEN 6
        WHEN p.current_energy_rating = 'E' THEN 5
        WHEN p.current_energy_rating = 'D' THEN 4
        ELSE 0
      END) as worst_rating_num
    FROM landlords l
    LEFT JOIN properties p ON p.landlord_id = l.id
    WHERE (l.match_group_id IS NULL OR l.is_primary_record = 1)
      AND (l.name IS NOT NULL AND l.name != '')
      AND EXISTS (
        SELECT 1 FROM properties p2
        WHERE p2.landlord_id = l.id
        AND p2.current_energy_rating IN ('D','E','F','G')
      )
    GROUP BY l.id
  `).all();

  const ratingLookup = { 4: 'D', 5: 'E', 6: 'F', 7: 'G' };

  const highPriorityCsv = stringify(highPriorityRows.map(r => ({
    'Name': r.name,
    'Entity Type': r.entity_type,
    'Company Number': r.company_number || '',
    'Sources': r.source,
    'Property Count': r.property_count,
    'Postcodes': r.postcodes || '',
    'EPC Ratings': r.epc_ratings || '',
    'HMO Licence': r.hmo_licence_number || '',
    'Registered Address': r.registered_address || '',
    'Worst EPC Rating': ratingLookup[r.worst_rating_num] || '',
  })), { header: true });

  fs.writeFileSync(path.join(exportsDir, `high-priority-leads-${dateStamp}.csv`), highPriorityCsv);

  // 3c. hmo-landlords — landlords with HMO licence numbers
  const hmoRows = db.prepare(`
    SELECT l.*,
      GROUP_CONCAT(DISTINCT p.address) as property_addresses,
      GROUP_CONCAT(DISTINCT p.postcode) as postcodes
    FROM landlords l
    LEFT JOIN properties p ON p.landlord_id = l.id
    WHERE l.hmo_licence_number IS NOT NULL
    GROUP BY l.id
  `).all();

  const hmoCsv = stringify(hmoRows.map(r => ({
    'Name': r.name,
    'Entity Type': r.entity_type,
    'Company Number': r.company_number || '',
    'HMO Licence': r.hmo_licence_number,
    'Property Address': r.property_addresses || '',
    'Postcode': r.postcodes || '',
    'Sources': r.source,
  })), { header: true });

  fs.writeFileSync(path.join(exportsDir, `hmo-landlords-${dateStamp}.csv`), hmoCsv);

  // 3d. snov-io-import — Ltd/LLP companies for email finding
  const snovRows = db.prepare(`
    SELECT l.*
    FROM landlords l
    WHERE (l.match_group_id IS NULL OR l.is_primary_record = 1)
      AND l.entity_type IN ('ltd', 'llp')
  `).all();

  const snovCsv = stringify(snovRows.map(r => {
    const nameParts = (r.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return {
      'First Name': firstName,
      'Last Name': lastName,
      'Company Name': r.name,
      'Location': 'Greater Manchester, UK',
      'Country': 'United Kingdom',
      'Position': 'Director',
    };
  }), { header: true });

  fs.writeFileSync(path.join(exportsDir, `snov-io-import-${dateStamp}.csv`), snovCsv);

  // 3e. review-matches — uncertain fuzzy matches
  const reviewRows = [];
  for (const group of review) {
    // Get postcodes for each landlord in the group
    for (let i = 0; i < group.ids.length; i++) {
      for (let j = i + 1; j < group.ids.length; j++) {
        const lA = db.prepare('SELECT id, name, source FROM landlords WHERE id = ?').get(group.ids[i]);
        const lB = db.prepare('SELECT id, name, source FROM landlords WHERE id = ?').get(group.ids[j]);
        if (!lA || !lB) continue;

        const pcsA = db.prepare('SELECT DISTINCT postcode FROM properties WHERE landlord_id = ?').all(group.ids[i]).map(r => r.postcode);
        const pcsB = db.prepare('SELECT DISTINCT postcode FROM properties WHERE landlord_id = ?').all(group.ids[j]).map(r => r.postcode);
        const shared = pcsA.filter(pc => pcsB.includes(pc));

        reviewRows.push({
          'Landlord A ID': lA.id,
          'Landlord A Name': lA.name,
          'Landlord A Source': lA.source,
          'Landlord B ID': lB.id,
          'Landlord B Name': lB.name,
          'Landlord B Source': lB.source,
          'Match Confidence': group.confidence,
          'Shared Postcodes': shared.join(', '),
        });
      }
    }
  }

  const reviewCsv = stringify(reviewRows, { header: true });
  fs.writeFileSync(path.join(exportsDir, `review-matches-${dateStamp}.csv`), reviewCsv);

  // --- Step 4: Log summary ---
  const summary = {
    exactGroups: exactStats.groupsCreated,
    autoMerged: fuzzyStats.groupsCreated,
    reviewFlagged: review.length,
    allLeads: allLeadsRows.length,
    highPriority: highPriorityRows.length,
    hmoLandlords: hmoRows.length,
    snovIo: snovRows.length,
    reviewMatches: reviewRows.length,
  };

  console.log(`Build lead list complete:
  Dedup: ${summary.exactGroups} exact groups, ${summary.autoMerged} auto-merged, ${summary.reviewFlagged} flagged for review
  Exports:
    all-leads-${dateStamp}.csv: ${summary.allLeads} leads
    high-priority-leads-${dateStamp}.csv: ${summary.highPriority} leads
    hmo-landlords-${dateStamp}.csv: ${summary.hmoLandlords} leads
    snov-io-import-${dateStamp}.csv: ${summary.snovIo} leads
    review-matches-${dateStamp}.csv: ${summary.reviewMatches} matches`);

  return summary;
}

// Run directly
if (require.main === module) {
  const db = require('./lib/db');
  const { EXPORTS_DIR } = require('./lib/config');
  const result = buildLeadList(db, EXPORTS_DIR);
  console.log('\nDone.', result);
}

module.exports = { buildLeadList };
