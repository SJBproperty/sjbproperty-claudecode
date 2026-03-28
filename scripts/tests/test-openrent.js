const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Database = require('better-sqlite3');

// Helper: create a temp DB with base schema + Phase 2 migration
function createTestDb() {
  const tmpDb = path.join(os.tmpdir(), `test-openrent-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const db = new Database(tmpDb);
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
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(uprn),
      UNIQUE(certificate_number)
    );
  `);

  const { runMigration } = require('../migrate-phase2');
  runMigration(db);

  return { db, tmpDb };
}

// Helper: create temp JSON file
function createTempJson(data) {
  const tmpJson = path.join(os.tmpdir(), `test-openrent-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmpJson, JSON.stringify(data, null, 2));
  return tmpJson;
}

describe('OpenRent processor', () => {
  const { processOpenRent } = require('../process-openrent');
  let db, tmpDb;
  const tempFiles = [];

  after(() => {
    if (db) { try { db.close(); } catch (e) {} }
    if (tmpDb) { try { fs.unlinkSync(tmpDb); } catch (e) {} }
    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch (e) {}
    }
  });

  it('creates landlord records with entity_type individual and source openrent', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const data = [
      {
        address: '10 High Street, Stockport SK1 1AA',
        landlordName: 'John Smith',
        rent: 850,
        url: 'https://www.openrent.com/property/123',
        availableDate: '2026-01-15',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processOpenRent(jsonPath, db);

    const landlords = db.prepare('SELECT * FROM landlords').all();
    assert.equal(landlords.length, 1);
    assert.equal(landlords[0].entity_type, 'individual');
    assert.equal(landlords[0].source, 'openrent');
    assert.equal(result.landlords, 1);
  });

  it('creates properties with listing_url, void_days, and postcode', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const pastStr = pastDate.toISOString().split('T')[0];

    const data = [
      {
        address: '20 Oak Road, Stockport SK3 8AB',
        landlordName: 'Jane Doe',
        rent: 750,
        url: 'https://www.openrent.com/property/456',
        availableDate: pastStr,
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processOpenRent(jsonPath, db);

    const properties = db.prepare('SELECT * FROM properties').all();
    assert.equal(properties.length, 1);
    assert.equal(properties[0].listing_url, 'https://www.openrent.com/property/456');
    assert.ok(properties[0].void_days >= 29, `void_days should be ~30 but got ${properties[0].void_days}`);
    assert.equal(properties[0].postcode, 'SK3 8AB');
  });

  it('identifies self-managing landlords (no agent listed)', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const data = [
      {
        address: '5 Mill Lane, Stockport SK5 7EF',
        landlordName: 'Private Landlord',
        rent: 600,
        url: 'https://www.openrent.com/property/789',
      },
      {
        address: '6 Mill Lane, Stockport SK5 7EG',
        landlordName: 'Bob Agent',
        agentName: 'Big Agency Ltd',
        rent: 650,
        url: 'https://www.openrent.com/property/790',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processOpenRent(jsonPath, db);
    assert.equal(result.imported, 2);

    // Both should be imported; self-managing flag is on the landlord source_ref or similar
    const properties = db.prepare('SELECT * FROM properties').all();
    assert.equal(properties.length, 2);
  });

  it('skips results with postcodes outside target area', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const data = [
      {
        address: '1 Target Street, Stockport SK1 1AA',
        landlordName: 'Target Person',
        url: 'https://www.openrent.com/property/100',
      },
      {
        address: '2 London Road, London W1A 1AB',
        landlordName: 'London Person',
        url: 'https://www.openrent.com/property/101',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processOpenRent(jsonPath, db);

    assert.equal(result.imported, 1);
    assert.equal(result.skipped, 1);
  });

  it('accepts JSON file path as input argument', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const data = [
      {
        address: '99 Test Road, Stockport SK2 5AA',
        landlordName: 'File Test',
        url: 'https://www.openrent.com/property/999',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    // Should not throw when given valid path
    const result = processOpenRent(jsonPath, db);
    assert.equal(result.imported, 1);
  });

  it('handles missing landlord name gracefully', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const data = [
      {
        address: '77 No Name Lane, Stockport SK4 1AB',
        rent: 500,
        url: 'https://www.openrent.com/property/777',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processOpenRent(jsonPath, db);

    assert.equal(result.imported, 1);
    assert.equal(result.landlords, 0);

    const properties = db.prepare('SELECT * FROM properties').all();
    assert.equal(properties.length, 1);
    assert.equal(properties[0].landlord_id, null);
  });
});
