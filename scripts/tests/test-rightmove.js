const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Database = require('better-sqlite3');

// Helper: create a temp DB with base schema + Phase 2 migration
function createTestDb() {
  const tmpDb = path.join(os.tmpdir(), `test-rightmove-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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
  const tmpJson = path.join(os.tmpdir(), `test-rightmove-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmpJson, JSON.stringify(data, null, 2));
  return tmpJson;
}

describe('Rightmove processor', () => {
  const { processRightmove } = require('../process-rightmove');
  let db, tmpDb;
  const tempFiles = [];

  after(() => {
    if (db) { try { db.close(); } catch (e) {} }
    if (tmpDb) { try { fs.unlinkSync(tmpDb); } catch (e) {} }
    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch (e) {}
    }
  });

  it('creates property records with listing_url, void_days, and source rightmove', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 45);
    const pastStr = pastDate.toISOString().split('T')[0];

    const data = [
      {
        address: '10 High Street, Stockport SK1 1AA',
        url: 'https://www.rightmove.co.uk/property/123',
        listingDate: pastStr,
        images: new Array(10).fill('img.jpg'),
        description: 'A lovely 3 bedroom house in a great location with many features and amenities nearby. Perfect for families or professionals looking for spacious accommodation. Recently renovated with modern kitchen and bathroom. Garden to the rear with off-street parking.',
        floorplan: 'https://media.rightmove.co.uk/fp/123.jpg',
        epcRating: 'D',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processRightmove(jsonPath, db);

    const properties = db.prepare('SELECT * FROM properties').all();
    assert.equal(properties.length, 1);
    assert.equal(properties[0].listing_url, 'https://www.rightmove.co.uk/property/123');
    assert.ok(properties[0].void_days >= 44, `void_days should be ~45 but got ${properties[0].void_days}`);
    assert.equal(properties[0].source, 'rightmove');
  });

  it('calculates listing_quality_score (0-100) based on photos, description, floorplan, EPC', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    // High quality listing: 16+ photos (40), long desc (30), floorplan (15), EPC (15) = 100
    const data = [
      {
        address: '20 Quality Ave, Stockport SK2 5AA',
        url: 'https://www.rightmove.co.uk/property/200',
        images: new Array(20).fill('img.jpg'),
        description: 'A'.repeat(800),
        floorplan: 'https://media.rightmove.co.uk/fp/200.jpg',
        epcRating: 'C',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processRightmove(jsonPath, db);

    const prop = db.prepare('SELECT * FROM properties').get();
    assert.equal(prop.listing_quality_score, 100);
  });

  it('calculates low listing_quality_score for poor listings', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    // Low quality: 0 photos (0), short desc (0), no floorplan (0), no EPC (0) = 0
    const data = [
      {
        address: '30 Bad Lane, Stockport SK3 8AB',
        url: 'https://www.rightmove.co.uk/property/300',
        description: 'Short',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processRightmove(jsonPath, db);

    const prop = db.prepare('SELECT * FROM properties').get();
    assert.equal(prop.listing_quality_score, 0);
  });

  it('skips results with postcodes outside target area', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const data = [
      {
        address: '1 Target Street, Stockport SK1 1AA',
        url: 'https://www.rightmove.co.uk/property/400',
      },
      {
        address: '2 London Road, London W1A 1AB',
        url: 'https://www.rightmove.co.uk/property/401',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processRightmove(jsonPath, db);

    assert.equal(result.imported, 1);
    assert.equal(result.skipped, 1);
  });

  it('accepts JSON file path as input argument', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const data = [
      {
        address: '99 File Test Road, Stockport SK4 1AB',
        url: 'https://www.rightmove.co.uk/property/999',
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    const result = processRightmove(jsonPath, db);
    assert.equal(result.imported, 1);
  });

  it('handles missing fields gracefully (no photos, no description)', () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const data = [
      {
        address: '50 Bare Lane, Stockport SK5 7EF',
        url: 'https://www.rightmove.co.uk/property/500',
        // No images, no description, no floorplan, no epc
      },
    ];
    const jsonPath = createTempJson(data);
    tempFiles.push(jsonPath);

    // Should not throw
    const result = processRightmove(jsonPath, db);
    assert.equal(result.imported, 1);

    const prop = db.prepare('SELECT * FROM properties').get();
    assert.equal(prop.listing_quality_score, 0);
    assert.equal(prop.void_days, 0);
  });
});
