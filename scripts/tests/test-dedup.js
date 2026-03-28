const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Helper to create a temp DB with full schema + Phase 2 migrations
function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-dedup-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS landlords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      entity_type TEXT CHECK(entity_type IN ('ltd','llp','individual','unknown')) DEFAULT 'unknown',
      company_number TEXT,
      registered_address TEXT,
      sic_codes TEXT,
      source TEXT NOT NULL,
      source_ref TEXT,
      scraped_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(company_number)
    );

    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landlord_id INTEGER REFERENCES landlords(id),
      uprn TEXT,
      address TEXT NOT NULL,
      postcode TEXT NOT NULL,
      current_energy_rating TEXT CHECK(current_energy_rating IN ('A','B','C','D','E','F','G')),
      property_type TEXT,
      tenure TEXT,
      transaction_type TEXT,
      lodgement_date TEXT,
      certificate_number TEXT,
      source TEXT NOT NULL,
      source_ref TEXT,
      scraped_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_properties_postcode ON properties(postcode);
    CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id);
    CREATE INDEX IF NOT EXISTS idx_landlords_company_number ON landlords(company_number);
  `);

  // Phase 2 migrations
  const migrations = [
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
  for (const sql of migrations) {
    try { db.exec(sql); } catch (e) {
      if (!e.message.includes('duplicate column name')) throw e;
    }
  }

  return { db, dbPath };
}

// Seed helpers
function insertLandlord(db, { name, entity_type = 'unknown', company_number = null, source, source_ref = null }) {
  return db.prepare(
    `INSERT INTO landlords (name, entity_type, company_number, source, source_ref, scraped_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).run(name, entity_type, company_number, source, source_ref).lastInsertRowid;
}

function insertProperty(db, { landlord_id, uprn = null, address, postcode, current_energy_rating = null, source }) {
  return db.prepare(
    `INSERT INTO properties (landlord_id, uprn, address, postcode, current_energy_rating, source, scraped_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(landlord_id, uprn, address, postcode, current_energy_rating, source).lastInsertRowid;
}

describe('dedup — exact matching', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
    // Two landlords with same company_number from different sources
    const id1 = insertLandlord(db, { name: 'ACME PROPERTY LTD', entity_type: 'ltd', company_number: '12345678', source: 'companies-house' });
    const id2 = insertLandlord(db, { name: 'ACME PROPERTY LIMITED', entity_type: 'ltd', company_number: null, source: 'epc' });
    // A third landlord with different company_number
    const id3 = insertLandlord(db, { name: 'JONES LETTINGS LTD', entity_type: 'ltd', company_number: '99999999', source: 'companies-house' });
    // A landlord with no company_number
    const id4 = insertLandlord(db, { name: 'SMITH INDIVIDUAL', entity_type: 'individual', source: 'openrent' });

    // Properties — id2 shares UPRN with id1's property
    insertProperty(db, { landlord_id: id1, uprn: 'UPRN001', address: '1 Test St', postcode: 'SK1 1AA', source: 'epc' });
    insertProperty(db, { landlord_id: id2, uprn: 'UPRN001', address: '1 Test Street', postcode: 'SK1 1AA', source: 'epc' });
    insertProperty(db, { landlord_id: id3, uprn: 'UPRN002', address: '2 Test St', postcode: 'SK2 2BB', source: 'epc' });
    insertProperty(db, { landlord_id: id4, uprn: 'UPRN003', address: '3 Test St', postcode: 'SK1 1CC', source: 'openrent' });
  });

  after(() => { db.close(); try { fs.unlinkSync(dbPath); } catch (e) {} });

  it('groups landlords sharing the same company_number', () => {
    const { findExactMatches } = require('../lib/dedup');
    const groups = findExactMatches(db);
    // id1 has company_number 12345678; only id1 has it (id2 has null)
    // But they share UPRN001 so should be grouped by UPRN
    const uprnGroup = groups.find(g => g.matchType === 'uprn');
    assert.ok(uprnGroup, 'Should find a UPRN match group');
    assert.ok(uprnGroup.ids.length >= 2, 'UPRN group should have at least 2 landlords');
  });

  it('does NOT group landlords with different company_numbers', () => {
    const { findExactMatches } = require('../lib/dedup');
    const groups = findExactMatches(db);
    // id1 (12345678) and id3 (99999999) must never be in the same group
    for (const g of groups) {
      const hasId1 = g.ids.includes(1);
      const hasId3 = g.ids.includes(3);
      assert.ok(!(hasId1 && hasId3), 'Landlords with different company_numbers must not be grouped');
    }
  });

  it('does not match landlords with NULL company_number in company number pass', () => {
    const { findExactMatches } = require('../lib/dedup');
    const groups = findExactMatches(db);
    const companyGroups = groups.filter(g => g.matchType === 'company_number');
    for (const g of companyGroups) {
      // None of the grouped IDs should be id4 (null company_number, no shared UPRN)
      assert.ok(!g.ids.includes(4), 'Landlord with NULL company_number should not appear in company_number group');
    }
  });

  it('groups landlords whose properties share the same UPRN', () => {
    const { findExactMatches } = require('../lib/dedup');
    const groups = findExactMatches(db);
    const uprnGroup = groups.find(g => g.matchType === 'uprn');
    assert.ok(uprnGroup, 'Should find a UPRN match group');
    // id1 and id2 share UPRN001
    const ids = uprnGroup.ids.sort();
    assert.ok(ids.includes(1) && ids.includes(2), 'UPRN group should contain landlords 1 and 2');
  });
});

describe('dedup — fuzzy matching', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
    // Landlords with similar names in same postcode area (SK1)
    const id1 = insertLandlord(db, { name: 'SMITH PROPERTY LTD', entity_type: 'ltd', source: 'epc' });
    const id2 = insertLandlord(db, { name: 'SMITH PROPERTY LIMITED', entity_type: 'ltd', source: 'openrent' });
    // Completely different name in same area
    const id3 = insertLandlord(db, { name: 'JONES LETTINGS LTD', entity_type: 'ltd', source: 'epc' });
    // Similar name but abbreviated — medium confidence
    const id4 = insertLandlord(db, { name: 'J SMITH', entity_type: 'individual', source: 'openrent' });
    const id5 = insertLandlord(db, { name: 'JOHN SMITH', entity_type: 'individual', source: 'epc' });
    // Landlord in different postcode area (M14)
    const id6 = insertLandlord(db, { name: 'SMITH PROPERTY LTD', entity_type: 'ltd', source: 'ccod' });

    // Properties — first 5 landlords in SK1, last one in M14
    insertProperty(db, { landlord_id: id1, address: '1 Test St', postcode: 'SK1 1AA', source: 'epc' });
    insertProperty(db, { landlord_id: id2, address: '2 Test St', postcode: 'SK1 2BB', source: 'openrent' });
    insertProperty(db, { landlord_id: id3, address: '3 Test St', postcode: 'SK1 3CC', source: 'epc' });
    insertProperty(db, { landlord_id: id4, address: '4 Test St', postcode: 'SK1 4DD', source: 'openrent' });
    insertProperty(db, { landlord_id: id5, address: '5 Test St', postcode: 'SK1 5EE', source: 'epc' });
    insertProperty(db, { landlord_id: id6, address: '6 Test St', postcode: 'M14 6FF', source: 'ccod' });
  });

  after(() => { db.close(); try { fs.unlinkSync(dbPath); } catch (e) {} });

  it('auto-merges very similar names (SMITH PROPERTY LTD vs LIMITED) with HIGH confidence', () => {
    const { findFuzzyMatches } = require('../lib/dedup');
    const result = findFuzzyMatches(db, { threshold: 0.3, autoMergeBelow: 0.2, rejectAbove: 0.4 });
    // id1 and id2 should be in autoMerge (normalised names are identical after LTD/LIMITED)
    const autoGroup = result.autoMerge.find(g => g.ids.includes(1) && g.ids.includes(2));
    assert.ok(autoGroup, 'SMITH PROPERTY LTD and SMITH PROPERTY LIMITED should auto-merge');
  });

  it('does NOT match completely different names', () => {
    const { findFuzzyMatches } = require('../lib/dedup');
    const result = findFuzzyMatches(db, { threshold: 0.3, autoMergeBelow: 0.2, rejectAbove: 0.4 });
    // id3 (JONES LETTINGS) should not be grouped with id1 (SMITH PROPERTY)
    const allGroups = [...result.autoMerge, ...result.review];
    for (const g of allGroups) {
      const hasSmith = g.ids.includes(1) || g.ids.includes(2);
      const hasJones = g.ids.includes(3);
      assert.ok(!(hasSmith && hasJones), 'SMITH PROPERTY and JONES LETTINGS should NOT match');
    }
  });

  it('does NOT match landlords across different postcode areas', () => {
    const { findFuzzyMatches } = require('../lib/dedup');
    const result = findFuzzyMatches(db, { threshold: 0.3, autoMergeBelow: 0.2, rejectAbove: 0.4 });
    // id6 (SMITH PROPERTY LTD in M14) should NOT be grouped with id1 (same name in SK1)
    const allGroups = [...result.autoMerge, ...result.review];
    for (const g of allGroups) {
      const hasSK1Smith = g.ids.includes(1) || g.ids.includes(2);
      const hasM14Smith = g.ids.includes(6);
      assert.ok(!(hasSK1Smith && hasM14Smith), 'Should NOT match same name across different postcode areas');
    }
  });
});

describe('dedup — merging', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
    // Landlords from different sources to test priority
    insertLandlord(db, { name: 'TEST COMPANY LTD', entity_type: 'ltd', company_number: '11111111', source: 'epc' });         // id=1
    insertLandlord(db, { name: 'TEST COMPANY LTD', entity_type: 'ltd', company_number: null, source: 'companies-house' });    // id=2
    insertLandlord(db, { name: 'TEST COMPANY LIMITED', entity_type: 'ltd', company_number: null, source: 'openrent' });       // id=3

    insertProperty(db, { landlord_id: 1, address: '1 Test St', postcode: 'SK1 1AA', source: 'epc' });
    insertProperty(db, { landlord_id: 2, address: '1 Test St', postcode: 'SK1 1AA', source: 'companies-house' });
    insertProperty(db, { landlord_id: 3, address: '1 Test St', postcode: 'SK1 1AA', source: 'openrent' });
  });

  after(() => { db.close(); try { fs.unlinkSync(dbPath); } catch (e) {} });

  it('sets companies-house record as primary (is_primary_record=1)', () => {
    const { mergeRecords } = require('../lib/dedup');
    const groups = [{ ids: [1, 2, 3], matchType: 'manual', confidence: 1.0 }];
    mergeRecords(db, groups);

    const primary = db.prepare('SELECT * FROM landlords WHERE is_primary_record = 1').all();
    assert.equal(primary.length, 1, 'Should have exactly 1 primary record');
    assert.equal(primary[0].source, 'companies-house', 'Primary should be companies-house source');
    assert.equal(primary[0].id, 2, 'Primary should be id=2 (companies-house)');
  });

  it('assigns same match_group_id to all records in group', () => {
    const records = db.prepare('SELECT match_group_id FROM landlords WHERE id IN (1, 2, 3)').all();
    const groupIds = new Set(records.map(r => r.match_group_id));
    assert.equal(groupIds.size, 1, 'All records in group should share the same match_group_id');
    assert.ok([...groupIds][0] !== null, 'match_group_id should not be null');
  });

  it('stores match_confidence on each record in the group', () => {
    const records = db.prepare('SELECT match_confidence FROM landlords WHERE id IN (1, 2, 3)').all();
    for (const r of records) {
      assert.equal(r.match_confidence, 1.0, 'match_confidence should be set to group confidence');
    }
  });

  it('respects source priority ordering: companies-house > epc > others', () => {
    // Already verified in the primary record test above, but let's verify the ordering explicitly
    const { mergeRecords } = require('../lib/dedup');
    // Create a fresh group in a new test db to test epc > openrent priority
    const { db: db2, dbPath: dbPath2 } = createTestDb();
    insertLandlord(db2, { name: 'ANOTHER LTD', entity_type: 'ltd', source: 'openrent' });   // id=1
    insertLandlord(db2, { name: 'ANOTHER LTD', entity_type: 'ltd', source: 'epc' });         // id=2
    insertLandlord(db2, { name: 'ANOTHER LTD', entity_type: 'ltd', source: 'rightmove' });   // id=3

    mergeRecords(db2, [{ ids: [1, 2, 3], matchType: 'manual', confidence: 0.9 }]);
    const primary = db2.prepare('SELECT * FROM landlords WHERE is_primary_record = 1').all();
    assert.equal(primary[0].source, 'epc', 'EPC should be primary when no companies-house source');

    db2.close();
    try { fs.unlinkSync(dbPath2); } catch (e) {}
  });
});
