/**
 * Link EPC properties (with NULL landlord_id) to existing landlords
 * via postcode + Fuse.js fuzzy address matching.
 *
 * Prerequisite for meaningful scoring — without this step, ~10,677
 * EPC properties cannot contribute signals to landlord scores.
 */

const Fuse = require('fuse.js');
const { runMigration } = require('./migrate-phase3');

/**
 * Normalise an address for fuzzy matching.
 * Uppercases, strips flat/apartment prefixes, expands abbreviations,
 * collapses whitespace.
 */
function normaliseAddress(address) {
  if (!address) return '';
  let result = address.toUpperCase();

  // Strip flat/apartment prefixes (e.g. "Flat 2, 45 High St" -> "45 High St")
  result = result.replace(/^(FLAT|APARTMENT|APT|UNIT)\s*\d*[A-Z]?\s*,?\s*/i, '');

  // Expand common abbreviations to full words for consistent matching
  const expansions = [
    [/\bRD\b/g, 'ROAD'],
    [/\bST\b/g, 'STREET'],
    [/\bAVE\b/g, 'AVENUE'],
    [/\bLN\b/g, 'LANE'],
    [/\bDR\b/g, 'DRIVE'],
    [/\bCT\b/g, 'COURT'],
    [/\bCRES\b/g, 'CRESCENT'],
    [/\bCL\b/g, 'CLOSE'],
    [/\bGDNS\b/g, 'GARDENS'],
    [/\bPL\b/g, 'PLACE'],
  ];

  for (const [pattern, full] of expansions) {
    result = result.replace(pattern, full);
  }

  // Remove commas and extra whitespace
  result = result.replace(/,/g, '').replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Link unlinked EPC properties to landlords via postcode + address matching.
 * @param {import('better-sqlite3').Database} db
 * @returns {{ totalUnlinked: number, matched: number, unmatched: number }}
 */
function linkEpcToLandlords(db) {
  // Ensure Phase 3 columns exist
  runMigration(db);

  // Get all unlinked properties grouped by postcode
  const unlinkedRows = db.prepare(
    `SELECT id, address, postcode FROM properties
     WHERE landlord_id IS NULL AND postcode IS NOT NULL`
  ).all();

  if (unlinkedRows.length === 0) {
    console.log('No unlinked properties found.');
    return { totalUnlinked: 0, matched: 0, unmatched: 0 };
  }

  console.log(`Found ${unlinkedRows.length} unlinked properties.`);

  // Group unlinked properties by postcode
  const byPostcode = {};
  for (const row of unlinkedRows) {
    const pc = row.postcode.toUpperCase().trim();
    if (!byPostcode[pc]) byPostcode[pc] = [];
    byPostcode[pc].push(row);
  }

  // Prepare statements
  const getLandlordsByPostcode = db.prepare(
    `SELECT DISTINCT l.id, l.name, l.registered_address
     FROM landlords l
     JOIN properties p ON p.landlord_id = l.id
     WHERE p.postcode = ?`
  );

  const getLandlordsByRegAddress = db.prepare(
    `SELECT DISTINCT l.id, l.name, l.registered_address
     FROM landlords l
     WHERE l.registered_address IS NOT NULL
       AND UPPER(l.registered_address) LIKE ?`
  );

  const getLinkedAddresses = db.prepare(
    `SELECT DISTINCT p.address FROM properties p
     WHERE p.landlord_id = ? AND p.postcode = ?`
  );

  const updateStmt = db.prepare(
    `UPDATE properties SET landlord_id = ? WHERE id = ?`
  );

  let matched = 0;
  let unmatched = 0;
  const postcodeStats = {};

  // Process each postcode batch
  const batchUpdate = db.transaction(() => {
    for (const [postcode, properties] of Object.entries(byPostcode)) {
      let pcMatched = 0;
      let pcTotal = properties.length;

      // Find landlords with existing linked properties in this postcode
      const landlords = getLandlordsByPostcode.all(postcode);

      // Also find landlords whose registered_address contains this postcode
      const regLandlords = getLandlordsByRegAddress.all(`%${postcode}%`);

      // Merge landlord lists (dedup by id)
      const landlordMap = new Map();
      for (const l of [...landlords, ...regLandlords]) {
        if (!landlordMap.has(l.id)) {
          landlordMap.set(l.id, l);
        }
      }

      const allLandlords = Array.from(landlordMap.values());

      if (allLandlords.length === 0) {
        unmatched += pcTotal;
        postcodeStats[postcode] = { total: pcTotal, matched: 0 };
        continue;
      }

      // Build address candidates for each landlord in this postcode
      const candidates = [];
      for (const landlord of allLandlords) {
        // Use existing linked property addresses
        const linkedAddresses = getLinkedAddresses.all(landlord.id, postcode);
        for (const la of linkedAddresses) {
          candidates.push({
            landlordId: landlord.id,
            address: normaliseAddress(la.address),
          });
        }

        // Use registered address if it contains this postcode
        if (landlord.registered_address &&
            landlord.registered_address.toUpperCase().includes(postcode)) {
          candidates.push({
            landlordId: landlord.id,
            address: normaliseAddress(landlord.registered_address),
          });
        }
      }

      if (candidates.length === 0) {
        unmatched += pcTotal;
        postcodeStats[postcode] = { total: pcTotal, matched: 0 };
        continue;
      }

      // Create Fuse index for this postcode's candidates
      const fuse = new Fuse(candidates, {
        keys: ['address'],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 3,
      });

      // Match each unlinked property
      for (const prop of properties) {
        const normAddr = normaliseAddress(prop.address);
        const results = fuse.search(normAddr);

        if (results.length > 0 && results[0].score <= 0.4) {
          const bestMatch = results[0].item;
          updateStmt.run(bestMatch.landlordId, prop.id);
          matched++;
          pcMatched++;
        } else {
          unmatched++;
        }
      }

      postcodeStats[postcode] = { total: pcTotal, matched: pcMatched };
    }
  });

  batchUpdate();

  // Log summary
  console.log(`\nEPC-Landlord Linking Summary:`);
  console.log(`  Total unlinked: ${unlinkedRows.length}`);
  console.log(`  Matched: ${matched}`);
  console.log(`  Unmatched: ${unmatched}`);
  console.log(`  Match rate: ${((matched / unlinkedRows.length) * 100).toFixed(1)}%`);

  // Log top postcodes by match rate
  const sortedPostcodes = Object.entries(postcodeStats)
    .filter(([, s]) => s.total >= 5)
    .sort((a, b) => (b[1].matched / b[1].total) - (a[1].matched / a[1].total))
    .slice(0, 10);

  if (sortedPostcodes.length > 0) {
    console.log(`\nTop postcodes by match rate:`);
    for (const [pc, stats] of sortedPostcodes) {
      const rate = ((stats.matched / stats.total) * 100).toFixed(0);
      console.log(`  ${pc}: ${stats.matched}/${stats.total} (${rate}%)`);
    }
  }

  return { totalUnlinked: unlinkedRows.length, matched, unmatched };
}

// Run directly if called as a script
if (require.main === module) {
  const db = require('./lib/db');
  const beforeCount = db.prepare(
    'SELECT COUNT(*) as c FROM properties WHERE landlord_id IS NOT NULL'
  ).get().c;

  linkEpcToLandlords(db);

  const afterCount = db.prepare(
    'SELECT COUNT(*) as c FROM properties WHERE landlord_id IS NOT NULL'
  ).get().c;
  console.log(`\nLinked properties: ${beforeCount} -> ${afterCount} (+${afterCount - beforeCount})`);
}

module.exports = { linkEpcToLandlords, normaliseAddress };
