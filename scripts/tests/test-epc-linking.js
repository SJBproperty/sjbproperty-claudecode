const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Create a temp DB with full schema + Phase 2 + Phase 3 migrations
 * for testing EPC-landlord address linking.
 */
function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-epc-linking-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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
  `);

  // Phase 2 migrations
  const phase2 = [
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
  for (const sql of phase2) {
    try { db.exec(sql); } catch (e) {
      if (!e.message.includes('duplicate column name')) throw e;
    }
  }

  // Phase 3 migrations
  const { runMigration } = require('../migrate-phase3');
  runMigration(db);

  return { db, dbPath };
}

function insertLandlord(db, { name, registered_address = null, source = 'epc' }) {
  return db.prepare(
    `INSERT INTO landlords (name, registered_address, source, scraped_at) VALUES (?, ?, ?, datetime('now'))`
  ).run(name, registered_address, source).lastInsertRowid;
}

function insertProperty(db, { landlord_id = null, address, postcode, source = 'epc' }) {
  return db.prepare(
    `INSERT INTO properties (landlord_id, address, postcode, source, scraped_at) VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(landlord_id, address, postcode, source).lastInsertRowid;
}

describe('EPC-landlord address linking', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('normalisation: "123 Oak Rd" matches "123 Oak Road"', () => {
    const { normaliseAddress } = require('../link-epc-landlords');
    const a = normaliseAddress('123 Oak Rd');
    const b = normaliseAddress('123 Oak Road');
    assert.equal(a, b, `"${a}" should equal "${b}"`);
  });

  it('fuzzy match: "Flat 2, 45 High Street" matches "45 High Street" landlord', () => {
    // Create a landlord with a linked property at 45 High Street
    const landlordId = insertLandlord(db, { name: 'FLAT MATCH LTD' });
    insertProperty(db, { landlord_id: landlordId, address: '45 High Street', postcode: 'SK1 1AA' });

    // Create an unlinked property at Flat 2, 45 High Street, same postcode
    const unlinkedId = insertProperty(db, { landlord_id: null, address: 'Flat 2, 45 High Street', postcode: 'SK1 1AA' });

    const { linkEpcToLandlords } = require('../link-epc-landlords');
    const result = linkEpcToLandlords(db);

    // Check the unlinked property now has a landlord_id
    const prop = db.prepare('SELECT landlord_id FROM properties WHERE id = ?').get(unlinkedId);
    assert.equal(prop.landlord_id, landlordId, 'Flat 2, 45 High Street should match to 45 High Street landlord');
    assert.ok(result.matched >= 1, 'Should have at least 1 match');
  });

  it('no false positive: "10 Park Lane" does NOT match "10 Park Road"', () => {
    // Create fresh DB to isolate this test
    const { db: db2, dbPath: dbPath2 } = createTestDb();

    const landlordId = insertLandlord(db2, { name: 'PARK ROAD LTD' });
    insertProperty(db2, { landlord_id: landlordId, address: '10 Park Road', postcode: 'SK2 2BB' });

    const unlinkedId = insertProperty(db2, { landlord_id: null, address: '10 Park Lane', postcode: 'SK2 2BB' });

    const { linkEpcToLandlords } = require('../link-epc-landlords');
    linkEpcToLandlords(db2);

    const prop = db2.prepare('SELECT landlord_id FROM properties WHERE id = ?').get(unlinkedId);
    assert.equal(prop.landlord_id, null, '10 Park Lane should NOT match 10 Park Road');

    db2.close();
    try { fs.unlinkSync(dbPath2); } catch (e) {}
  });

  it('postcode scoping: properties only match landlords in same postcode', () => {
    const { db: db3, dbPath: dbPath3 } = createTestDb();

    const landlordId = insertLandlord(db3, { name: 'SCOPED LTD' });
    insertProperty(db3, { landlord_id: landlordId, address: '99 Main Street', postcode: 'SK3 3CC' });

    // Unlinked property with SAME address but DIFFERENT postcode
    const unlinkedId = insertProperty(db3, { landlord_id: null, address: '99 Main Street', postcode: 'SK4 4DD' });

    const { linkEpcToLandlords } = require('../link-epc-landlords');
    linkEpcToLandlords(db3);

    const prop = db3.prepare('SELECT landlord_id FROM properties WHERE id = ?').get(unlinkedId);
    assert.equal(prop.landlord_id, null, 'Should NOT match across different postcodes');

    db3.close();
    try { fs.unlinkSync(dbPath3); } catch (e) {}
  });
});
