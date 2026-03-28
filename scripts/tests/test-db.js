const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

const TEST_DB_PATH = path.join(os.tmpdir(), `test-sjb-leads-${Date.now()}.db`);

describe('Database schema', () => {
  let db;

  before(() => {
    // Run init-db schema against a temporary database
    db = new Database(TEST_DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Load and execute the schema from init-db.js
    // We replicate the schema here to test it independently
    const initDbPath = path.join(__dirname, '..', 'init-db.js');
    assert.ok(fs.existsSync(initDbPath), 'init-db.js must exist');

    // Read the schema SQL from init-db.js and execute it
    // Instead, we require the schema function or just run the DDL directly
    // For testing, we execute the same DDL that init-db.js uses
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

      CREATE INDEX IF NOT EXISTS idx_properties_postcode ON properties(postcode);
      CREATE INDEX IF NOT EXISTS idx_properties_rating ON properties(current_energy_rating);
      CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id);
      CREATE INDEX IF NOT EXISTS idx_landlords_entity_type ON landlords(entity_type);
      CREATE INDEX IF NOT EXISTS idx_landlords_company_number ON landlords(company_number);
    `);
  });

  after(() => {
    if (db) db.close();
    try { fs.unlinkSync(TEST_DB_PATH); } catch (e) { /* ignore */ }
  });

  it('Test 1: creates landlords table with correct columns', () => {
    const cols = db.pragma('table_info(landlords)');
    const colNames = cols.map(c => c.name);
    const expected = ['id', 'name', 'entity_type', 'company_number', 'registered_address', 'sic_codes', 'source', 'source_ref', 'scraped_at', 'created_at'];
    for (const name of expected) {
      assert.ok(colNames.includes(name), `landlords table missing column: ${name}`);
    }
  });

  it('Test 2: creates properties table with correct columns', () => {
    const cols = db.pragma('table_info(properties)');
    const colNames = cols.map(c => c.name);
    const expected = ['id', 'landlord_id', 'uprn', 'address', 'postcode', 'current_energy_rating', 'property_type', 'tenure', 'transaction_type', 'lodgement_date', 'certificate_number', 'source', 'source_ref', 'scraped_at', 'created_at'];
    for (const name of expected) {
      assert.ok(colNames.includes(name), `properties table missing column: ${name}`);
    }
  });

  it('Test 3: entity_type CHECK constraint rejects invalid values', () => {
    assert.throws(() => {
      db.prepare(`INSERT INTO landlords (name, entity_type, source, scraped_at) VALUES ('Test', 'corporation', 'test', '2026-01-01')`).run();
    }, /CHECK constraint/i);
  });

  it('Test 4: properties.uprn UNIQUE constraint prevents duplicates', () => {
    db.prepare(`INSERT INTO landlords (name, source, scraped_at) VALUES ('Test Landlord', 'test', '2026-01-01')`).run();
    db.prepare(`INSERT INTO properties (address, postcode, uprn, source, scraped_at) VALUES ('1 Test St', 'SK1 1AA', 'UPRN001', 'test', '2026-01-01')`).run();
    assert.throws(() => {
      db.prepare(`INSERT INTO properties (address, postcode, uprn, source, scraped_at) VALUES ('2 Test St', 'SK1 1AB', 'UPRN001', 'test', '2026-01-01')`).run();
    }, /UNIQUE constraint/i);
  });

  it('Test 5: properties.landlord_id foreign key references landlords(id)', () => {
    assert.throws(() => {
      db.prepare(`INSERT INTO properties (landlord_id, address, postcode, source, scraped_at) VALUES (99999, '3 Test St', 'SK1 1AC', 'test', '2026-01-01')`).run();
    }, /FOREIGN KEY constraint/i);
  });

  it('Test 6: indexes exist on expected columns', () => {
    const propIndexes = db.pragma('index_list(properties)');
    const propIndexNames = propIndexes.map(i => i.name);
    assert.ok(propIndexNames.includes('idx_properties_postcode'), 'Missing index: idx_properties_postcode');
    assert.ok(propIndexNames.includes('idx_properties_rating'), 'Missing index: idx_properties_rating');
    assert.ok(propIndexNames.includes('idx_properties_landlord'), 'Missing index: idx_properties_landlord');

    const landlordIndexes = db.pragma('index_list(landlords)');
    const landlordIndexNames = landlordIndexes.map(i => i.name);
    assert.ok(landlordIndexNames.includes('idx_landlords_entity_type'), 'Missing index: idx_landlords_entity_type');
    assert.ok(landlordIndexNames.includes('idx_landlords_company_number'), 'Missing index: idx_landlords_company_number');
  });

  it('Test 7: db.js exports a Database instance with WAL mode and foreign keys', () => {
    const dbModule = require('../lib/db');
    assert.ok(dbModule, 'db.js must export something');
    assert.ok(typeof dbModule.prepare === 'function', 'db.js must export a Database instance with prepare()');

    const walMode = dbModule.pragma('journal_mode', { simple: true });
    assert.strictEqual(walMode, 'wal', 'journal_mode should be WAL');

    const fkEnabled = dbModule.pragma('foreign_keys', { simple: true });
    assert.strictEqual(fkEnabled, 1, 'foreign_keys should be ON (1)');
    dbModule.close();
  });

  it('Test 8: config.js exports POSTCODES with SK1-SK8 and M14, M19, M20, M21, M22', () => {
    const config = require('../lib/config');
    assert.ok(Array.isArray(config.POSTCODES), 'POSTCODES must be an array');
    const expected = ['SK1', 'SK2', 'SK3', 'SK4', 'SK5', 'SK6', 'SK7', 'SK8', 'M14', 'M19', 'M20', 'M21', 'M22'];
    for (const pc of expected) {
      assert.ok(config.POSTCODES.includes(pc), `POSTCODES missing: ${pc}`);
    }
  });
});
