const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Database = require('better-sqlite3');

const { normaliseAddress, normaliseName, extractPostcodeOutcode } = require('../lib/normalise');

describe('normaliseAddress', () => {
  it('replaces STREET with ST and uppercases', () => {
    assert.equal(normaliseAddress('123 Maple Street'), '123 MAPLE ST');
  });

  it('replaces CRESCENT and ROAD abbreviations', () => {
    assert.equal(normaliseAddress('45 Crescent Road, Manchester'), '45 CRES RD, MANCHESTER');
  });

  it('collapses whitespace and trims', () => {
    assert.equal(normaliseAddress('  10   High  Street  '), '10 HIGH ST');
  });
});

describe('normaliseName', () => {
  it('replaces LIMITED with LTD', () => {
    assert.equal(normaliseName('SMITH PROPERTY LIMITED'), 'SMITH PROPERTY LTD');
  });

  it('uppercases and preserves LLP', () => {
    assert.equal(normaliseName('Jones & Partners LLP'), 'JONES & PARTNERS LLP');
  });

  it('strips non-alphanumeric except & and space', () => {
    assert.equal(normaliseName('Test (Holdings) Ltd.'), 'TEST HOLDINGS LTD');
  });
});

describe('extractPostcodeOutcode', () => {
  it('extracts SK1 from SK1 1AA', () => {
    assert.equal(extractPostcodeOutcode('SK1 1AA'), 'SK1');
  });

  it('extracts M14 from M14 5TP', () => {
    assert.equal(extractPostcodeOutcode('M14 5TP'), 'M14');
  });

  it('returns null for invalid postcode', () => {
    assert.equal(extractPostcodeOutcode('invalid'), null);
  });

  it('returns null for empty string', () => {
    assert.equal(extractPostcodeOutcode(''), null);
  });
});

describe('migrate-phase2 idempotency', () => {
  it('running migration twice does not error', () => {
    const tmpDb = path.join(os.tmpdir(), `test-migrate-${Date.now()}.db`);
    const db = new Database(tmpDb);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create base schema
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

    // Load and run migration function
    const { runMigration } = require('../migrate-phase2');

    // First run
    assert.doesNotThrow(() => runMigration(db));

    // Second run (idempotent)
    assert.doesNotThrow(() => runMigration(db));

    // Verify columns exist
    const landlordCols = db.prepare("PRAGMA table_info(landlords)").all().map(c => c.name);
    assert.ok(landlordCols.includes('hmo_licence_number'), 'landlords should have hmo_licence_number');
    assert.ok(landlordCols.includes('ccod_title_numbers'), 'landlords should have ccod_title_numbers');
    assert.ok(landlordCols.includes('match_group_id'), 'landlords should have match_group_id');

    const propCols = db.prepare("PRAGMA table_info(properties)").all().map(c => c.name);
    assert.ok(propCols.includes('void_days'), 'properties should have void_days');
    assert.ok(propCols.includes('listing_url'), 'properties should have listing_url');
    assert.ok(propCols.includes('title_number'), 'properties should have title_number');

    db.close();
    fs.unlinkSync(tmpDb);
  });
});
