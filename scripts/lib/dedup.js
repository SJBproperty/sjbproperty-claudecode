const Fuse = require('fuse.js');
const { normaliseName, extractPostcodeOutcode } = require('./normalise');

/**
 * Source priority for determining primary record during merge.
 * Lower number = higher priority.
 */
const SOURCE_PRIORITY = {
  'companies-house': 1,
  'epc': 2,
  'ccod': 3,
  'hmo-register': 4,
  'openrent': 5,
  'rightmove': 6,
};

function getSourcePriority(source) {
  return SOURCE_PRIORITY[source] || 99;
}

/**
 * Pass 1: Exact matching on company_number and shared UPRN.
 * Returns array of match groups: [{ ids: [1, 5, 12], matchType: 'company_number'|'uprn', confidence: 1.0 }]
 */
function findExactMatches(db) {
  const groups = [];
  const assignedIds = new Set();

  // --- Company number pass ---
  const landlords = db.prepare('SELECT id, name, company_number, source FROM landlords').all();
  const byCompanyNumber = {};

  for (const l of landlords) {
    if (l.company_number) {
      if (!byCompanyNumber[l.company_number]) {
        byCompanyNumber[l.company_number] = [];
      }
      byCompanyNumber[l.company_number].push(l.id);
    }
  }

  for (const [companyNumber, ids] of Object.entries(byCompanyNumber)) {
    if (ids.length >= 2) {
      groups.push({ ids: [...ids], matchType: 'company_number', confidence: 1.0 });
      ids.forEach(id => assignedIds.add(id));
    }
  }

  // --- UPRN pass ---
  const properties = db.prepare('SELECT landlord_id, uprn FROM properties WHERE uprn IS NOT NULL').all();
  const byUprn = {};

  for (const p of properties) {
    if (!byUprn[p.uprn]) {
      byUprn[p.uprn] = new Set();
    }
    byUprn[p.uprn].add(p.landlord_id);
  }

  for (const [uprn, landlordIdSet] of Object.entries(byUprn)) {
    const landlordIds = [...landlordIdSet];
    if (landlordIds.length >= 2) {
      // Check if any of these are already in an existing group — merge into that group
      let existingGroup = null;
      for (const id of landlordIds) {
        existingGroup = groups.find(g => g.ids.includes(id));
        if (existingGroup) break;
      }

      if (existingGroup) {
        // Add any new IDs to the existing group
        for (const id of landlordIds) {
          if (!existingGroup.ids.includes(id)) {
            existingGroup.ids.push(id);
            assignedIds.add(id);
          }
        }
      } else {
        groups.push({ ids: landlordIds, matchType: 'uprn', confidence: 1.0 });
        landlordIds.forEach(id => assignedIds.add(id));
      }
    }
  }

  return groups;
}

/**
 * Pass 2: Fuzzy name matching for landlords not yet in a match group.
 * Only compares within the same postcode outcode area.
 * Returns: { autoMerge: [...groups], review: [...groups] }
 */
function findFuzzyMatches(db, options = {}) {
  const {
    threshold = 0.3,
    autoMergeBelow = 0.2,
    rejectAbove = 0.4,
  } = options;

  const autoMerge = [];
  const review = [];

  // Get landlords not yet in a match group
  const unmatched = db.prepare(
    'SELECT id, name, source FROM landlords WHERE match_group_id IS NULL'
  ).all();

  // For each unmatched landlord, find their outcode area from properties
  const propStmt = db.prepare(
    'SELECT DISTINCT postcode FROM properties WHERE landlord_id = ?'
  );

  const landlordsByOutcode = {};

  for (const l of unmatched) {
    const props = propStmt.all(l.id);
    const outcodes = new Set();
    for (const p of props) {
      const outcode = extractPostcodeOutcode(p.postcode);
      if (outcode) outcodes.add(outcode);
    }

    const normName = normaliseName(l.name);

    for (const outcode of outcodes) {
      if (!landlordsByOutcode[outcode]) {
        landlordsByOutcode[outcode] = [];
      }
      landlordsByOutcode[outcode].push({
        id: l.id,
        name: l.name,
        normalisedName: normName,
        source: l.source,
      });
    }

    // If landlord has no properties, skip fuzzy matching
  }

  // Within each outcode, run fuzzy matching
  const processedPairs = new Set();
  const idToGroup = {};

  for (const [outcode, landlordsInArea] of Object.entries(landlordsByOutcode)) {
    if (landlordsInArea.length < 2) continue;

    const fuse = new Fuse(landlordsInArea, {
      keys: ['normalisedName'],
      threshold: rejectAbove,
      includeScore: true,
      minMatchCharLength: 3,
    });

    for (const landlord of landlordsInArea) {
      const results = fuse.search(landlord.normalisedName);

      for (const result of results) {
        const matchedLandlord = result.item;
        if (matchedLandlord.id === landlord.id) continue;

        // Create a unique pair key to avoid duplicates
        const pairKey = [landlord.id, matchedLandlord.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const score = result.score;

        if (score < autoMergeBelow) {
          // HIGH confidence — auto merge
          addToGroupList(autoMerge, idToGroup, landlord.id, matchedLandlord.id, score, 'fuzzy');
        } else if (score <= rejectAbove) {
          // MEDIUM confidence — flag for review
          addToGroupList(review, idToGroup, landlord.id, matchedLandlord.id, score, 'fuzzy');
        }
        // score > rejectAbove: no match
      }
    }
  }

  return { autoMerge, review };
}

/**
 * Helper to add a pair of IDs to the appropriate group list.
 * Merges into existing groups if one of the IDs is already assigned.
 */
function addToGroupList(groupList, idToGroup, id1, id2, score, matchType) {
  const existingGroup1 = idToGroup[id1];
  const existingGroup2 = idToGroup[id2];

  if (existingGroup1 && existingGroup2) {
    // Both already in groups — merge groups if different
    if (existingGroup1 !== existingGroup2) {
      for (const id of existingGroup2.ids) {
        existingGroup1.ids.push(id);
        idToGroup[id] = existingGroup1;
      }
      existingGroup1.confidence = Math.min(existingGroup1.confidence, 1 - score);
      const idx = groupList.indexOf(existingGroup2);
      if (idx !== -1) groupList.splice(idx, 1);
    }
  } else if (existingGroup1) {
    existingGroup1.ids.push(id2);
    idToGroup[id2] = existingGroup1;
    existingGroup1.confidence = Math.min(existingGroup1.confidence, 1 - score);
  } else if (existingGroup2) {
    existingGroup2.ids.push(id1);
    idToGroup[id1] = existingGroup2;
    existingGroup2.confidence = Math.min(existingGroup2.confidence, 1 - score);
  } else {
    const group = {
      ids: [id1, id2],
      matchType,
      confidence: 1 - score,
    };
    groupList.push(group);
    idToGroup[id1] = group;
    idToGroup[id2] = group;
  }
}

/**
 * Apply merge results: set match_group_id, match_confidence, is_primary_record.
 * Primary record determined by source priority: companies-house > epc > ccod > hmo-register > openrent > rightmove.
 * Returns stats: { groupsCreated, recordsMerged, reviewFlagged }
 */
function mergeRecords(db, matchGroups) {
  if (!matchGroups || matchGroups.length === 0) {
    return { groupsCreated: 0, recordsMerged: 0, reviewFlagged: 0 };
  }

  // Get current max match_group_id
  const maxRow = db.prepare('SELECT MAX(match_group_id) as maxId FROM landlords').get();
  let nextGroupId = (maxRow.maxId || 0) + 1;

  const updateStmt = db.prepare(
    'UPDATE landlords SET match_group_id = ?, match_confidence = ?, is_primary_record = 0 WHERE id = ?'
  );
  const setPrimaryStmt = db.prepare(
    'UPDATE landlords SET is_primary_record = 1 WHERE id = ?'
  );
  const getSourceStmt = db.prepare(
    'SELECT id, source FROM landlords WHERE id = ?'
  );

  let groupsCreated = 0;
  let recordsMerged = 0;

  const applyGroups = db.transaction(() => {
    for (const group of matchGroups) {
      const groupId = nextGroupId++;
      const confidence = group.confidence || 1.0;

      // Update all records in group
      for (const id of group.ids) {
        updateStmt.run(groupId, confidence, id);
        recordsMerged++;
      }

      // Determine primary by source priority
      let bestId = group.ids[0];
      let bestPriority = Infinity;

      for (const id of group.ids) {
        const row = getSourceStmt.get(id);
        if (row) {
          const priority = getSourcePriority(row.source);
          if (priority < bestPriority) {
            bestPriority = priority;
            bestId = row.id;
          }
        }
      }

      setPrimaryStmt.run(bestId);
      groupsCreated++;
    }
  });

  applyGroups();

  return { groupsCreated, recordsMerged, reviewFlagged: 0 };
}

module.exports = { findExactMatches, findFuzzyMatches, mergeRecords };
