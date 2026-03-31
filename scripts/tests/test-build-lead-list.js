const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Helper to create a temp DB with full schema + Phase 2 migrations
function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-build-lead-list-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

  return { db, dbPath };
}

function insertLandlord(db, { name, entity_type = 'unknown', company_number = null, source, hmo_licence_number = null }) {
  return db.prepare(
    `INSERT INTO landlords (name, entity_type, company_number, source, hmo_licence_number, scraped_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).run(name, entity_type, company_number, source, hmo_licence_number).lastInsertRowid;
}

function insertProperty(db, { landlord_id, uprn = null, address, postcode, current_energy_rating = null, source }) {
  return db.prepare(
    `INSERT INTO properties (landlord_id, uprn, address, postcode, current_energy_rating, source, scraped_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(landlord_id, uprn, address, postcode, current_energy_rating, source).lastInsertRowid;
}

describe('build-lead-list — full pipeline', () => {
  let db, dbPath, exportsDir;

  before(async () => {
    ({ db, dbPath } = createTestDb());
    exportsDir = path.join(os.tmpdir(), `test-exports-${Date.now()}`);
    fs.mkdirSync(exportsDir, { recursive: true });

    // Seed data:
    // 3 landlords sharing company_number "12345678" (will be deduped)
    const id1 = insertLandlord(db, { name: 'ACME PROPERTY LTD', entity_type: 'ltd', company_number: '12345678', source: 'companies-house' });
    const id2 = insertLandlord(db, { name: 'ACME PROPERTY LIMITED', entity_type: 'ltd', company_number: null, source: 'epc' });
    const id3 = insertLandlord(db, { name: 'ACME PROPERTY LTD', entity_type: 'ltd', company_number: null, source: 'openrent' });

    // HMO landlord
    const id4 = insertLandlord(db, { name: 'HMO HOMES LTD', entity_type: 'ltd', company_number: '88888888', source: 'hmo-register', hmo_licence_number: 'HMO/2024/001' });

    // Standalone landlord (unique name, no company number match)
    const id5 = insertLandlord(db, { name: 'UNIQUE LANDLORD', entity_type: 'individual', source: 'epc' });

    // Similar names for fuzzy matching in same postcode area
    const id6 = insertLandlord(db, { name: 'SMITH PROPERTY LTD', entity_type: 'ltd', company_number: '55555555', source: 'epc' });
    const id7 = insertLandlord(db, { name: 'SMITH PROPERTY LIMITED', entity_type: 'ltd', company_number: null, source: 'openrent' });

    // Properties with mixed EPC ratings
    insertProperty(db, { landlord_id: id1, uprn: 'U001', address: '1 High St', postcode: 'SK1 1AA', current_energy_rating: 'F', source: 'epc' });
    insertProperty(db, { landlord_id: id2, uprn: 'U001', address: '1 High Street', postcode: 'SK1 1AA', current_energy_rating: 'F', source: 'epc' });
    insertProperty(db, { landlord_id: id3, address: '1 High St', postcode: 'SK1 1AA', source: 'openrent' });
    insertProperty(db, { landlord_id: id4, address: '10 Room Rd', postcode: 'SK2 2BB', current_energy_rating: 'D', source: 'epc' });
    insertProperty(db, { landlord_id: id5, address: '5 Solo Ln', postcode: 'SK3 3CC', current_energy_rating: 'B', source: 'epc' });
    insertProperty(db, { landlord_id: id6, address: '6 Smith Ave', postcode: 'SK1 6DD', current_energy_rating: 'G', source: 'epc' });
    insertProperty(db, { landlord_id: id7, address: '7 Smith Ave', postcode: 'SK1 7EE', current_energy_rating: 'E', source: 'openrent' });

    // Run the pipeline
    const { buildLeadList } = require('../build-lead-list');
    await buildLeadList(db, exportsDir);
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
    try { fs.rmSync(exportsDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('creates 5 CSV files in exports directory', () => {
    const files = fs.readdirSync(exportsDir);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    assert.ok(csvFiles.length >= 5, `Expected at least 5 CSV files, got ${csvFiles.length}: ${csvFiles.join(', ')}`);

    const prefixes = ['all-leads-', 'high-priority-leads-', 'hmo-landlords-', 'snov-io-import-', 'review-matches-'];
    for (const prefix of prefixes) {
      const found = csvFiles.some(f => f.startsWith(prefix));
      assert.ok(found, `Missing CSV file with prefix: ${prefix}`);
    }
  });

  it('all-leads CSV has fewer rows than total landlord count (dedup worked)', () => {
    const files = fs.readdirSync(exportsDir);
    const allLeadsFile = files.find(f => f.startsWith('all-leads-'));
    const content = fs.readFileSync(path.join(exportsDir, allLeadsFile), 'utf8');
    const lines = content.trim().split('\n');
    const dataRows = lines.length - 1; // minus header

    const totalLandlords = db.prepare('SELECT COUNT(*) as count FROM landlords').get().count;
    assert.ok(dataRows < totalLandlords, `all-leads should have fewer rows (${dataRows}) than total landlords (${totalLandlords}) after dedup`);
  });

  it('high-priority-leads CSV only contains landlords with EPC D-G rated properties', () => {
    const files = fs.readdirSync(exportsDir);
    const hpFile = files.find(f => f.startsWith('high-priority-leads-'));
    const content = fs.readFileSync(path.join(exportsDir, hpFile), 'utf8');
    const lines = content.trim().split('\n');
    const dataRows = lines.length - 1;

    // Should include ACME (F), HMO HOMES (D), SMITH (G/E) but NOT UNIQUE LANDLORD (B only)
    assert.ok(dataRows >= 1, 'high-priority should have at least 1 row');
    assert.ok(!content.includes('UNIQUE LANDLORD'), 'UNIQUE LANDLORD (B rating only) should NOT be in high-priority');
  });

  it('hmo-landlords CSV includes HMO-licensed landlord', () => {
    const files = fs.readdirSync(exportsDir);
    const hmoFile = files.find(f => f.startsWith('hmo-landlords-'));
    const content = fs.readFileSync(path.join(exportsDir, hmoFile), 'utf8');

    assert.ok(content.includes('HMO HOMES LTD'), 'HMO-licensed landlord should be in hmo-landlords CSV');
    assert.ok(content.includes('HMO/2024/001'), 'HMO licence number should appear in CSV');
  });

  it('snov-io-import CSV has correct format with Greater Manchester location', () => {
    const files = fs.readdirSync(exportsDir);
    const snovFile = files.find(f => f.startsWith('snov-io-import-'));
    const content = fs.readFileSync(path.join(exportsDir, snovFile), 'utf8');
    const lines = content.trim().split('\n');

    // Check header contains expected columns
    const header = lines[0];
    assert.ok(header.includes('First Name'), 'Should have First Name column');
    assert.ok(header.includes('Last Name'), 'Should have Last Name column');
    assert.ok(header.includes('Company Name'), 'Should have Company Name column');
    assert.ok(header.includes('Location'), 'Should have Location column');
    assert.ok(header.includes('Country'), 'Should have Country column');
    assert.ok(header.includes('Position'), 'Should have Position column');

    // Check Location contains Greater Manchester
    assert.ok(content.includes('Greater Manchester'), 'Location should contain Greater Manchester');
    assert.ok(content.includes('Director'), 'Position should be Director');
  });

  it('review-matches CSV exists', () => {
    const files = fs.readdirSync(exportsDir);
    const reviewFile = files.find(f => f.startsWith('review-matches-'));
    assert.ok(reviewFile, 'review-matches CSV should exist');
  });

  it('CSV files have date-stamped filenames', () => {
    const files = fs.readdirSync(exportsDir);
    const datePattern = /\d{4}-\d{2}-\d{2}/;
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    for (const f of csvFiles) {
      assert.ok(datePattern.test(f), `File ${f} should have date stamp in name`);
    }
  });
});
