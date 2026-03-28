const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

const TEST_DB_PATH = path.join(os.tmpdir(), `test-epc-${Date.now()}.db`);

describe('EPC API scraper', () => {
  let db;
  let epc;

  before(() => {
    // Create temp database with properties schema
    db = new Database(TEST_DB_PATH);
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

    // Load the EPC module (we need to require it after creating the test DB)
    // The module exports its pure functions for testing
    epc = require('../epc-api');
  });

  after(() => {
    if (db) db.close();
    try { fs.unlinkSync(TEST_DB_PATH); } catch (e) { /* ignore */ }
  });

  it('Test 1: buildURL constructs correct URL with postcode and energy-band=d,e,f,g and size=5000', () => {
    const url = epc.buildURL('SK1');
    assert.ok(url.includes('postcode=SK1'), 'URL must include postcode parameter');
    assert.ok(url.includes('energy-band=d%2Ce%2Cf%2Cg') || url.includes('energy-band=d,e,f,g'), 'URL must include energy-band=d,e,f,g');
    assert.ok(url.includes('size=5000'), 'URL must include size=5000');
    assert.ok(url.startsWith('https://epc.opendatacommunities.org/api/v1/domestic/search'), 'URL must use correct EPC API base');
  });

  it('Test 1b: buildURL includes search-after when provided', () => {
    const url = epc.buildURL('SK1', 'some-cursor-token');
    assert.ok(url.includes('search-after=some-cursor-token'), 'URL must include search-after parameter when cursor provided');
  });

  it('Test 2: parseEPCRow extracts and maps hyphenated API fields to underscored DB columns', () => {
    const apiRow = {
      'address': '1 Test Street, Stockport',
      'postcode': 'SK1 1AA',
      'uprn': '100012345678',
      'current-energy-rating': 'D',
      'property-type': 'House',
      'tenure': 'Rented (private)',
      'transaction-type': 'rental',
      'lodgement-date': '2024-06-15',
      'lmk-key': 'ABC123DEF456',
    };

    const parsed = epc.parseEPCRow(apiRow);
    assert.strictEqual(parsed.address, '1 Test Street, Stockport');
    assert.strictEqual(parsed.postcode, 'SK1 1AA');
    assert.strictEqual(parsed.uprn, '100012345678');
    assert.strictEqual(parsed.current_energy_rating, 'D');
    assert.strictEqual(parsed.property_type, 'House');
    assert.strictEqual(parsed.tenure, 'Rented (private)');
    assert.strictEqual(parsed.transaction_type, 'rental');
    assert.strictEqual(parsed.lodgement_date, '2024-06-15');
    assert.strictEqual(parsed.certificate_number, 'ABC123DEF456');
  });

  it('Test 3: filterRental returns only rows where tenure is "Rented (private)"', () => {
    const rows = [
      { 'tenure': 'Rented (private)', 'address': 'A' },
      { 'tenure': 'Owner-occupied', 'address': 'B' },
      { 'tenure': 'Rented (social)', 'address': 'C' },
      { 'tenure': 'Rented (private)', 'address': 'D' },
      { 'tenure': '', 'address': 'E' },
    ];

    const filtered = epc.filterRental(rows);
    assert.strictEqual(filtered.length, 2, 'Should return only 2 private rental rows');
    assert.strictEqual(filtered[0].address, 'A');
    assert.strictEqual(filtered[1].address, 'D');
  });

  it('Test 4: deduplicateByUPRN keeps only the latest EPC by lodgement-date per UPRN', () => {
    const rows = [
      { 'uprn': 'UPRN001', 'lodgement-date': '2022-01-01', 'address': 'Old' },
      { 'uprn': 'UPRN001', 'lodgement-date': '2024-06-15', 'address': 'New' },
      { 'uprn': 'UPRN002', 'lodgement-date': '2023-03-01', 'address': 'Only' },
    ];

    const deduped = epc.deduplicateByUPRN(rows);
    assert.strictEqual(deduped.length, 2, 'Should return 2 unique UPRNs');

    const uprn001 = deduped.find(r => r.uprn === 'UPRN001');
    assert.strictEqual(uprn001.address, 'New', 'Should keep the latest lodgement-date for UPRN001');
  });

  it('Test 4b: deduplicateByUPRN groups by address+postcode when UPRN is missing', () => {
    const rows = [
      { 'uprn': '', 'address': '1 Test St', 'postcode': 'SK1 1AA', 'lodgement-date': '2022-01-01' },
      { 'uprn': '', 'address': '1 Test St', 'postcode': 'SK1 1AA', 'lodgement-date': '2024-06-15' },
    ];

    const deduped = epc.deduplicateByUPRN(rows);
    assert.strictEqual(deduped.length, 1, 'Should deduplicate by address+postcode when UPRN is missing');
    assert.strictEqual(deduped[0]['lodgement-date'], '2024-06-15', 'Should keep the latest');
  });

  it('Test 5: insertProperties uses INSERT OR IGNORE for duplicate UPRNs', () => {
    const rows = [
      {
        uprn: 'TEST_UPRN_001',
        address: '1 Test Street',
        postcode: 'SK1 1AA',
        current_energy_rating: 'D',
        property_type: 'House',
        tenure: 'Rented (private)',
        transaction_type: 'rental',
        lodgement_date: '2024-06-15',
        certificate_number: 'CERT001',
      },
    ];

    // Insert once
    const count1 = epc.insertProperties(db, rows);
    assert.strictEqual(count1, 1, 'First insert should add 1 row');

    // Insert same UPRN again (different cert number to avoid that unique constraint)
    const rows2 = [{
      ...rows[0],
      certificate_number: 'CERT002',
    }];
    const count2 = epc.insertProperties(db, rows2);
    assert.strictEqual(count2, 0, 'Second insert with same UPRN should be ignored');

    // Verify only 1 row in DB
    const total = db.prepare('SELECT COUNT(*) as cnt FROM properties WHERE uprn = ?').get('TEST_UPRN_001');
    assert.strictEqual(total.cnt, 1, 'Database should contain exactly 1 row for the UPRN');
  });

  it('Test 6: insertProperties sets source=epc_api and scraped_at to ISO 8601 timestamp', () => {
    const rows = [
      {
        uprn: 'TEST_UPRN_002',
        address: '2 Test Street',
        postcode: 'SK1 1AB',
        current_energy_rating: 'E',
        property_type: 'Flat',
        tenure: 'Rented (private)',
        transaction_type: 'rental',
        lodgement_date: '2024-07-01',
        certificate_number: 'CERT003',
      },
    ];

    epc.insertProperties(db, rows);

    const row = db.prepare('SELECT source, scraped_at FROM properties WHERE uprn = ?').get('TEST_UPRN_002');
    assert.strictEqual(row.source, 'epc_api', 'source must be epc_api');
    // ISO 8601 format check: YYYY-MM-DDTHH:MM:SS.sssZ
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(row.scraped_at), `scraped_at must be ISO 8601 format, got: ${row.scraped_at}`);
  });
});
