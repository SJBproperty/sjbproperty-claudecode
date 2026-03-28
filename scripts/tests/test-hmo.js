const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');

// Helper: create a temp DB with base schema + Phase 2 migration
function createTestDb() {
  const tmpDb = path.join(os.tmpdir(), `test-hmo-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

  // Run Phase 2 migration
  const { runMigration } = require('../migrate-phase2');
  runMigration(db);

  return { db, tmpDb };
}

// Helper: create a temp CSV file
function createTempCsv(headers, rows) {
  const tmpCsv = path.join(os.tmpdir(), `test-hmo-${Date.now()}-${Math.random().toString(36).slice(2)}.csv`);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const line = headers.map((h, i) => {
      const val = row[i] || '';
      return val.includes(',') ? `"${val}"` : val;
    }).join(',');
    lines.push(line);
  }
  fs.writeFileSync(tmpCsv, lines.join('\n'));
  return tmpCsv;
}

// Helper: create a temp XLSX file
function createTempXlsx(headers, rows) {
  const tmpXlsx = path.join(os.tmpdir(), `test-hmo-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);
  const data = rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, tmpXlsx);
  return tmpXlsx;
}

describe('HMO register parser', () => {
  // We will require parseHmo which should export a function
  const { parseHmo } = require('../parse-hmo');
  let db, tmpDb;
  const tempFiles = [];

  after(() => {
    if (db) { try { db.close(); } catch (e) {} }
    if (tmpDb) { try { fs.unlinkSync(tmpDb); } catch (e) {} }
    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch (e) {}
    }
  });

  it('parses CSV with Stockport-style columns (Licence Holder, Address, Postcode, Licence Number)', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const headers = ['Licence Holder', 'Address', 'Postcode', 'Licence Number'];
    const rows = [
      ['John Smith', '10 High Street, Stockport', 'SK1 1AA', 'HMO-001'],
      ['Jane Doe', '5 Oak Road, Stockport', 'SK3 8AB', 'HMO-002'],
    ];
    const csvPath = createTempCsv(headers, rows);
    tempFiles.push(csvPath);

    const result = await parseHmo(csvPath, 'stockport', db);

    assert.equal(result.imported, 2);
    const landlords = db.prepare('SELECT * FROM landlords').all();
    assert.equal(landlords.length, 2);
    const properties = db.prepare('SELECT * FROM properties').all();
    assert.equal(properties.length, 2);
    assert.equal(properties[0].address, '10 High Street, Stockport');
  });

  it('parses CSV with Manchester-style columns (Landlord Name, Property Address, Post Code, HMO Licence)', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const headers = ['Landlord Name', 'Property Address', 'Post Code', 'HMO Licence'];
    const rows = [
      ['Bob Builder', '20 Moss Lane, Manchester', 'M14 5TP', 'HMO-100'],
    ];
    const csvPath = createTempCsv(headers, rows);
    tempFiles.push(csvPath);

    const result = await parseHmo(csvPath, 'manchester', db);

    assert.equal(result.imported, 1);
    const landlords = db.prepare('SELECT * FROM landlords').all();
    assert.equal(landlords.length, 1);
    const properties = db.prepare('SELECT * FROM properties').all();
    assert.equal(properties.length, 1);
    assert.equal(properties[0].postcode, 'M14 5TP');
  });

  it('parses XLSX files the same as CSV', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const headers = ['Licence Holder', 'Address', 'Postcode', 'Licence Number'];
    const rows = [
      ['Alice Wonder', '15 Park Avenue, Stockport', 'SK2 6CD', 'HMO-200'],
    ];
    const xlsxPath = createTempXlsx(headers, rows);
    tempFiles.push(xlsxPath);

    const result = await parseHmo(xlsxPath, 'stockport', db);

    assert.equal(result.imported, 1);
    const properties = db.prepare('SELECT * FROM properties').all();
    assert.equal(properties.length, 1);
    assert.equal(properties[0].postcode, 'SK2 6CD');
  });

  it('skips rows with postcodes outside target area', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const headers = ['Licence Holder', 'Address', 'Postcode', 'Licence Number'];
    const rows = [
      ['Target Person', '1 Test St, Stockport', 'SK1 1AA', 'HMO-300'],
      ['Out Person', '2 London Road, London', 'W1A 1AB', 'HMO-301'],
      ['Out Person 2', '3 Leeds Road, Leeds', 'LS1 4BT', 'HMO-302'],
    ];
    const csvPath = createTempCsv(headers, rows);
    tempFiles.push(csvPath);

    const result = await parseHmo(csvPath, 'stockport', db);

    assert.equal(result.imported, 1);
    assert.equal(result.skipped, 2);
  });

  it('sets source to hmo-register and source_ref to council name', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const headers = ['Licence Holder', 'Address', 'Postcode', 'Licence Number'];
    const rows = [
      ['Test Landlord', '7 Bridge Street, Stockport', 'SK4 1AA', 'HMO-400'],
    ];
    const csvPath = createTempCsv(headers, rows);
    tempFiles.push(csvPath);

    await parseHmo(csvPath, 'stockport', db);

    const landlord = db.prepare('SELECT * FROM landlords').get();
    assert.equal(landlord.source, 'hmo-register');
    assert.equal(landlord.source_ref, 'stockport');

    const property = db.prepare('SELECT * FROM properties').get();
    assert.equal(property.source, 'hmo-register');
    assert.equal(property.source_ref, 'stockport');
  });

  it('stores hmo_licence_number on both landlord and property records', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const headers = ['Licence Holder', 'Address', 'Postcode', 'Licence Number'];
    const rows = [
      ['Licence Test', '9 Mill Lane, Stockport', 'SK5 7EF', 'HMO-500'],
    ];
    const csvPath = createTempCsv(headers, rows);
    tempFiles.push(csvPath);

    await parseHmo(csvPath, 'stockport', db);

    const landlord = db.prepare('SELECT * FROM landlords').get();
    assert.equal(landlord.hmo_licence_number, 'HMO-500');

    const property = db.prepare('SELECT * FROM properties').get();
    assert.equal(property.hmo_licence_number, 'HMO-500');
  });

  it('logs column mapping used and row counts', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const headers = ['Licence Holder', 'Address', 'Postcode', 'Licence Number'];
    const rows = [
      ['Log Test', '11 High Street, Stockport', 'SK1 1AA', 'HMO-600'],
    ];
    const csvPath = createTempCsv(headers, rows);
    tempFiles.push(csvPath);

    const result = await parseHmo(csvPath, 'stockport', db);

    // result should contain total and imported counts
    assert.ok(typeof result.total === 'number');
    assert.ok(typeof result.imported === 'number');
    assert.ok(typeof result.skipped === 'number');
    assert.ok(result.mapping, 'result should include column mapping used');
  });

  it('exits with clear error if no known column mapping matches', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    const headers = ['Foo', 'Bar', 'Baz', 'Qux'];
    const rows = [
      ['x', 'y', 'z', 'w'],
    ];
    const csvPath = createTempCsv(headers, rows);
    tempFiles.push(csvPath);

    assert.throws(
      () => parseHmo(csvPath, 'unknown', db),
      (err) => {
        assert.ok(err.message.includes('Cannot map required columns'), `Expected 'Cannot map required columns' but got: ${err.message}`);
        return true;
      }
    );
  });
});
