const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Helper to create a temp DB with full schema + all migrations
function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-stannp-export-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

  // Phase 3 + Phase 4 migrations
  const { runMigration: runPhase3 } = require('../migrate-phase3');
  const { runMigration: runPhase4 } = require('../migrate-phase4');
  runPhase3(db);
  runPhase4(db);

  // owner_address column (from enrich-proprietor-address.js)
  try { db.exec('ALTER TABLE landlords ADD COLUMN owner_address TEXT'); } catch (e) {}

  return { db, dbPath };
}

function insertLandlord(db, opts) {
  const {
    name, entity_type = 'unknown', company_number = null, source = 'epc',
    tired_score = 50, btl_suitable = 1, owner_address = null,
    mailing_address = null, director_names = null, suppressed = 0,
    match_group_id = null, is_primary_record = 0,
  } = opts;
  return db.prepare(`
    INSERT INTO landlords (name, entity_type, company_number, source, tired_score,
      btl_suitable, owner_address, mailing_address, director_names, suppressed,
      match_group_id, is_primary_record, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(name, entity_type, company_number, source, tired_score, btl_suitable,
    owner_address, mailing_address, director_names, suppressed,
    match_group_id, is_primary_record).lastInsertRowid;
}

function insertProperty(db, opts) {
  const {
    landlord_id, address, postcode, current_energy_rating = null, source = 'epc',
  } = opts;
  return db.prepare(`
    INSERT INTO properties (landlord_id, address, postcode, current_energy_rating, source, scraped_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(landlord_id, address, postcode, current_energy_rating, source).lastInsertRowid;
}

describe('Stannp CSV export', () => {
  let db, dbPath, exportsDir, csvRows, csvContent;

  before(() => {
    ({ db, dbPath } = createTestDb());
    exportsDir = path.join(os.tmpdir(), `test-stannp-exports-${Date.now()}`);
    fs.mkdirSync(exportsDir, { recursive: true });

    // --- Seed data ---

    // Lead 1: Ltd with director_names, has owner_address — tired_score 90
    const id1 = insertLandlord(db, {
      name: 'ACME PROPERTY LTD', entity_type: 'ltd', tired_score: 90,
      btl_suitable: 1, owner_address: '10 Director Lane, Manchester, M1 1AA',
      director_names: 'John Smith, Jane Doe',
    });
    insertProperty(db, { landlord_id: id1, address: '1 High Street, Stockport', postcode: 'SK1 1AA', current_energy_rating: 'F' });
    insertProperty(db, { landlord_id: id1, address: '2 Low Road, Stockport', postcode: 'SK1 2BB', current_energy_rating: 'E' });

    // Lead 2: Individual, has mailing_address but no owner_address — tired_score 80
    const id2 = insertLandlord(db, {
      name: 'Sarah Jones', entity_type: 'individual', tired_score: 80,
      btl_suitable: 1, mailing_address: '20 Tenant Close, Salford, M5 3CC',
    });
    insertProperty(db, { landlord_id: id2, address: '5 Solo Lane, Stockport', postcode: 'SK3 3CC', current_energy_rating: 'D' });

    // Lead 3: Ltd WITHOUT director_names — tired_score 70
    const id3 = insertLandlord(db, {
      name: 'BORING INVESTMENTS LTD', entity_type: 'ltd', tired_score: 70,
      btl_suitable: 1, mailing_address: '30 Company Road, Bolton, BL1 4DD',
    });
    insertProperty(db, { landlord_id: id3, address: '8 Estate Way, Stockport', postcode: 'SK4 4DD', current_energy_rating: 'G' });

    // Lead 4: SUPPRESSED — should be excluded
    const id4 = insertLandlord(db, {
      name: 'SUPPRESSED LANDLORD LTD', entity_type: 'ltd', tired_score: 95,
      btl_suitable: 1, suppressed: 1, owner_address: '99 Hidden St, London, SW1A 1AA',
    });
    insertProperty(db, { landlord_id: id4, address: '9 Secret Rd, Stockport', postcode: 'SK5 5EE', current_energy_rating: 'F' });

    // Lead 5: NOT btl_suitable — should be excluded
    const id5 = insertLandlord(db, {
      name: 'HMO ONLY LTD', entity_type: 'ltd', tired_score: 85,
      btl_suitable: 0, owner_address: '50 HMO Lane, Manchester, M2 2FF',
    });
    insertProperty(db, { landlord_id: id5, address: '11 Room Rd, Stockport', postcode: 'SK2 6FF', current_energy_rating: 'E' });

    // Lead 6: No address at all (no owner, no mailing, no properties) — should be excluded
    const id6 = insertLandlord(db, {
      name: 'GHOST LANDLORD', entity_type: 'individual', tired_score: 60,
      btl_suitable: 1,
    });

    // Lead 7: Non-primary dedup record — should be excluded
    const id7 = insertLandlord(db, {
      name: 'DUPE LANDLORD LTD', entity_type: 'ltd', tired_score: 75,
      btl_suitable: 1, match_group_id: 1, is_primary_record: 0,
      owner_address: '40 Clone Ave, Manchester, M3 3GG',
    });
    insertProperty(db, { landlord_id: id7, address: '12 Dup St, Stockport', postcode: 'SK6 7GG', current_energy_rating: 'D' });

    // Lead 8: Property-only address (no owner, no mailing) — tired_score 50
    const id8 = insertLandlord(db, {
      name: 'PROPERTY ONLY PERSON', entity_type: 'individual', tired_score: 50,
      btl_suitable: 1,
    });
    insertProperty(db, { landlord_id: id8, address: '15 Fallback Drive, Stockport', postcode: 'SK7 8HH', current_energy_rating: 'E' });

    // Run the export
    const { exportStannp } = require('../export-stannp');
    exportStannp(db, exportsDir, 30);

    // Read the CSV output
    const files = fs.readdirSync(exportsDir);
    const csvFile = files.find(f => f.startsWith('stannp-btl-'));
    assert.ok(csvFile, 'CSV file with stannp-btl- prefix should exist');
    csvContent = fs.readFileSync(path.join(exportsDir, csvFile), 'utf8');
    csvRows = parse(csvContent, { columns: true, skip_empty_lines: true });
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
    try { fs.rmSync(exportsDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('Test 1: CSV has required Stannp columns', () => {
    const expectedColumns = [
      'title', 'firstname', 'lastname', 'company',
      'address1', 'address2', 'city', 'postcode', 'country',
      'epc_rating', 'property_count', 'property_address',
    ];
    const actualColumns = Object.keys(csvRows[0]);
    for (const col of expectedColumns) {
      assert.ok(actualColumns.includes(col), `Missing column: ${col}. Got: ${actualColumns.join(', ')}`);
    }
  });

  it('Test 2: Suppressed leads are excluded', () => {
    const names = csvRows.map(r => r.company || `${r.firstname} ${r.lastname}`);
    const hasSuppressed = names.some(n => n.includes('SUPPRESSED'));
    assert.ok(!hasSuppressed, 'Suppressed landlord should not appear in export');
  });

  it('Test 3: Only btl_suitable=1 leads are included', () => {
    const names = csvRows.map(r => r.company || `${r.firstname} ${r.lastname}`);
    const hasHmoOnly = names.some(n => n.includes('HMO ONLY'));
    assert.ok(!hasHmoOnly, 'Non-BTL lead should not appear in export');
  });

  it('Test 4: Leads are ordered by tired_score descending', () => {
    // Lead 1 (ACME, score=90) should come before Lead 2 (Sarah, score=80)
    // which should come before Lead 3 (BORING, score=70) etc.
    const idx1 = csvRows.findIndex(r => r.company === 'ACME PROPERTY LTD');
    const idx2 = csvRows.findIndex(r => r.firstname === 'Sarah');
    const idx3 = csvRows.findIndex(r => r.company === 'BORING INVESTMENTS LTD');
    assert.ok(idx1 < idx2, `ACME (score 90) should come before Sarah (score 80). idx1=${idx1}, idx2=${idx2}`);
    assert.ok(idx2 < idx3, `Sarah (score 80) should come before BORING (score 70). idx2=${idx2}, idx3=${idx3}`);
  });

  it('Test 5: Address waterfall prefers owner_address > mailing_address > property address', () => {
    // Lead 1 has owner_address — should use it
    const acmeRow = csvRows.find(r => r.company === 'ACME PROPERTY LTD');
    assert.ok(acmeRow, 'ACME row should exist');
    assert.ok(acmeRow.address1.includes('Director Lane') || acmeRow.address1.includes('10'),
      `ACME should use owner_address. Got address1: ${acmeRow.address1}`);

    // Lead 2 has mailing_address but no owner_address — should use mailing
    const sarahRow = csvRows.find(r => r.firstname === 'Sarah');
    assert.ok(sarahRow, 'Sarah row should exist');
    assert.ok(sarahRow.address1.includes('Tenant Close') || sarahRow.address1.includes('20'),
      `Sarah should use mailing_address. Got address1: ${sarahRow.address1}`);

    // Lead 8 has only property address — should use property address
    const propOnlyRow = csvRows.find(r => r.firstname === 'PROPERTY');
    assert.ok(propOnlyRow, 'PROPERTY ONLY PERSON row should exist');
    assert.ok(propOnlyRow.address1.includes('Fallback') || propOnlyRow.address1.includes('15'),
      `PROPERTY ONLY PERSON should use property address. Got address1: ${propOnlyRow.address1}`);
  });

  it('Test 6: Ltd/LLP with director_names uses director name for firstname/lastname', () => {
    const acmeRow = csvRows.find(r => r.company === 'ACME PROPERTY LTD');
    assert.ok(acmeRow, 'ACME row should exist');
    assert.equal(acmeRow.firstname, 'John', 'firstname should be first director first name');
    assert.equal(acmeRow.lastname, 'Smith', 'lastname should be first director last name');
    assert.equal(acmeRow.company, 'ACME PROPERTY LTD', 'company should be company name');
  });

  it('Test 7: Individual name is split into firstname/lastname, company empty', () => {
    const sarahRow = csvRows.find(r => r.firstname === 'Sarah');
    assert.ok(sarahRow, 'Sarah row should exist');
    assert.equal(sarahRow.firstname, 'Sarah');
    assert.equal(sarahRow.lastname, 'Jones');
    assert.equal(sarahRow.company, '', 'company should be empty for individuals');
  });

  it('Test 8: Ltd WITHOUT director_names has company name, empty firstname/lastname', () => {
    const boringRow = csvRows.find(r => r.company === 'BORING INVESTMENTS LTD');
    assert.ok(boringRow, 'BORING row should exist');
    assert.equal(boringRow.firstname, '');
    assert.equal(boringRow.lastname, '');
    assert.equal(boringRow.company, 'BORING INVESTMENTS LTD');
  });

  it('Test 9: UK postcode correctly extracted from address strings', () => {
    const acmeRow = csvRows.find(r => r.company === 'ACME PROPERTY LTD');
    assert.ok(acmeRow, 'ACME row should exist');
    assert.equal(acmeRow.postcode, 'M1 1AA', 'Postcode should be extracted from owner_address');
  });

  it('Test 10: Batch size limits output rows', () => {
    // Re-run with batch size 2
    const smallDir = path.join(os.tmpdir(), `test-stannp-batch-${Date.now()}`);
    fs.mkdirSync(smallDir, { recursive: true });

    const { exportStannp } = require('../export-stannp');
    exportStannp(db, smallDir, 2);

    const files = fs.readdirSync(smallDir);
    const csvFile = files.find(f => f.startsWith('stannp-btl-'));
    const content = fs.readFileSync(path.join(smallDir, csvFile), 'utf8');
    const rows = parse(content, { columns: true, skip_empty_lines: true });
    assert.ok(rows.length <= 2, `Batch size 2 should return max 2 rows, got ${rows.length}`);

    try { fs.rmSync(smallDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('Test 11: Leads with no address at all are excluded', () => {
    const names = csvRows.map(r => `${r.firstname} ${r.lastname}`.trim() || r.company);
    const hasGhost = names.some(n => n.includes('GHOST'));
    assert.ok(!hasGhost, 'GHOST LANDLORD (no address) should not appear in export');
  });

  it('Test 12: Non-primary dedup records are excluded', () => {
    const names = csvRows.map(r => r.company || `${r.firstname} ${r.lastname}`);
    const hasDupe = names.some(n => n.includes('DUPE'));
    assert.ok(!hasDupe, 'DUPE LANDLORD (non-primary) should not appear in export');
  });
});
