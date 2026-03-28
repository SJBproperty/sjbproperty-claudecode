const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Database = require('better-sqlite3');

// Helper: create a temp DB with base schema + Phase 2 migration
function createTestDb() {
  const tmpDb = path.join(os.tmpdir(), `test-ccod-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

// Helper: create a temp CSV with CCOD-format data
function createTestCsv(rows) {
  const headers = [
    'Title Number', 'Tenure', 'Property Address', 'District', 'County', 'Region', 'Postcode',
    'Multiple Address Indicator', 'Price Paid', 'Proprietor Name (1)', 'Company Registration No (1)',
    'Proprietorship Category (1)', 'Proprietor (1) Address (1)', 'Proprietor Name (2)',
    'Company Registration No (2)', 'Proprietorship Category (2)', 'Proprietor (2) Address (1)',
    'Proprietor Name (3)', 'Company Registration No (3)', 'Proprietorship Category (3)',
    'Proprietor (3) Address (1)', 'Proprietor Name (4)', 'Company Registration No (4)',
    'Proprietorship Category (4)', 'Proprietor (4) Address (1)', 'Date Proprietor Added',
    'Additional Proprietor Indicator'
  ];

  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const line = headers.map(h => {
      const val = row[h] || '';
      // Quote values that contain commas
      return val.includes(',') ? `"${val}"` : val;
    }).join(',');
    csvLines.push(line);
  }

  const tmpCsv = path.join(os.tmpdir(), `test-ccod-${Date.now()}.csv`);
  fs.writeFileSync(tmpCsv, csvLines.join('\n'));
  return tmpCsv;
}

describe('CCOD importer', () => {
  let db, tmpDb, csvPath;
  const { importCcod } = require('../import-ccod');

  after(() => {
    if (db) { try { db.close(); } catch (e) {} }
    if (tmpDb) { try { fs.unlinkSync(tmpDb); } catch (e) {} }
    if (csvPath) { try { fs.unlinkSync(csvPath); } catch (e) {} }
  });

  it('imports rows with target postcodes (SK1)', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    csvPath = createTestCsv([
      {
        'Title Number': 'GM123456',
        'Tenure': 'Freehold',
        'Property Address': '10 High Street, Stockport',
        'Postcode': 'SK1 1AA',
        'Proprietor Name (1)': 'ACME PROPERTIES LIMITED',
        'Company Registration No (1)': '12345678',
        'Proprietorship Category (1)': 'Corporate Body',
        'Proprietor (1) Address (1)': '1 Test Road, Manchester',
        'Date Proprietor Added': '01/01/2020',
      },
    ]);

    const result = await importCcod(csvPath, db);

    assert.equal(result.imported, 1);
    assert.equal(result.skipped, 0);

    const landlords = db.prepare('SELECT * FROM landlords').all();
    assert.equal(landlords.length, 1);
    assert.equal(landlords[0].company_number, '12345678');
    assert.equal(landlords[0].source, 'ccod');
    assert.equal(landlords[0].entity_type, 'ltd');

    const properties = db.prepare('SELECT * FROM properties').all();
    assert.equal(properties.length, 1);
    assert.equal(properties[0].postcode, 'SK1 1AA');
    assert.equal(properties[0].title_number, 'GM123456');
  });

  it('imports rows with M14 postcode and stores proprietor name', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    csvPath = createTestCsv([
      {
        'Title Number': 'GM789012',
        'Tenure': 'Leasehold',
        'Property Address': '5 Moss Lane, Manchester',
        'Postcode': 'M14 5TP',
        'Proprietor Name (1)': 'JONES HOLDINGS LTD',
        'Company Registration No (1)': '87654321',
        'Proprietorship Category (1)': 'Corporate Body',
        'Proprietor (1) Address (1)': '2 Business Park, Salford',
        'Date Proprietor Added': '15/06/2019',
      },
    ]);

    const result = await importCcod(csvPath, db);
    assert.equal(result.imported, 1);

    const landlords = db.prepare('SELECT * FROM landlords').all();
    assert.equal(landlords.length, 1);
    assert.ok(landlords[0].name.includes('JONES'));
  });

  it('skips rows with non-target postcodes (LS1)', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    csvPath = createTestCsv([
      {
        'Title Number': 'WY111111',
        'Property Address': '1 Leeds Road, Leeds',
        'Postcode': 'LS1 2AB',
        'Proprietor Name (1)': 'LEEDS PROP LTD',
        'Company Registration No (1)': '11111111',
        'Proprietorship Category (1)': 'Corporate Body',
      },
    ]);

    const result = await importCcod(csvPath, db);
    assert.equal(result.imported, 0);
    assert.equal(result.skipped, 1);

    const landlords = db.prepare('SELECT * FROM landlords').all();
    assert.equal(landlords.length, 0);
  });

  it('skips rows with no postcode', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    csvPath = createTestCsv([
      {
        'Title Number': 'XX000000',
        'Property Address': 'Somewhere Unknown',
        'Postcode': '',
        'Proprietor Name (1)': 'MYSTERY LTD',
        'Company Registration No (1)': '00000000',
        'Proprietorship Category (1)': 'Corporate Body',
      },
    ]);

    const result = await importCcod(csvPath, db);
    assert.equal(result.imported, 0);
    assert.equal(result.skipped, 1);
  });

  it('upserts duplicate company numbers and accumulates title numbers', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    csvPath = createTestCsv([
      {
        'Title Number': 'GM001',
        'Property Address': '1 First Street, Stockport',
        'Postcode': 'SK1 1AA',
        'Proprietor Name (1)': 'MEGA PROPERTY LTD',
        'Company Registration No (1)': '99999999',
        'Proprietorship Category (1)': 'Corporate Body',
      },
      {
        'Title Number': 'GM002',
        'Property Address': '2 Second Street, Stockport',
        'Postcode': 'SK1 2BB',
        'Proprietor Name (1)': 'MEGA PROPERTY LTD',
        'Company Registration No (1)': '99999999',
        'Proprietorship Category (1)': 'Corporate Body',
      },
    ]);

    const result = await importCcod(csvPath, db);
    assert.equal(result.imported, 2);

    const landlords = db.prepare('SELECT * FROM landlords').all();
    assert.equal(landlords.length, 1, 'should have only one landlord record');

    const titleNumbers = JSON.parse(landlords[0].ccod_title_numbers);
    assert.ok(titleNumbers.includes('GM001'), 'should include first title number');
    assert.ok(titleNumbers.includes('GM002'), 'should include second title number');

    const properties = db.prepare('SELECT * FROM properties').all();
    assert.equal(properties.length, 2, 'should have two property records');
  });

  it('applies proprietor name normalisation', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    csvPath = createTestCsv([
      {
        'Title Number': 'GM555',
        'Property Address': '5 Test Avenue, Stockport',
        'Postcode': 'SK3 8AA',
        'Proprietor Name (1)': 'smith property limited',
        'Company Registration No (1)': '55555555',
        'Proprietorship Category (1)': 'Corporate Body',
      },
    ]);

    const result = await importCcod(csvPath, db);
    assert.equal(result.imported, 1);

    const landlords = db.prepare('SELECT * FROM landlords').all();
    assert.equal(landlords[0].name, 'SMITH PROPERTY LTD');
  });

  it('returns counts of imported vs skipped rows', async () => {
    const setup = createTestDb();
    db = setup.db;
    tmpDb = setup.tmpDb;

    csvPath = createTestCsv([
      {
        'Title Number': 'GM100',
        'Property Address': '10 Target St, Stockport',
        'Postcode': 'SK2 5AA',
        'Proprietor Name (1)': 'TARGET LTD',
        'Company Registration No (1)': '10101010',
        'Proprietorship Category (1)': 'Corporate Body',
      },
      {
        'Title Number': 'XX200',
        'Property Address': '20 Skip Road, London',
        'Postcode': 'W1A 1AA',
        'Proprietor Name (1)': 'LONDON LTD',
        'Company Registration No (1)': '20202020',
        'Proprietorship Category (1)': 'Corporate Body',
      },
    ]);

    const result = await importCcod(csvPath, db);
    assert.equal(result.total, 2);
    assert.equal(result.imported, 1);
    assert.equal(result.skipped, 1);
  });
});
