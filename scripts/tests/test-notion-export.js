const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Helper to create a temp DB with full schema including Phase 3 columns
function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-notion-export-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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
      hmo_licence_number TEXT,
      ccod_title_numbers TEXT,
      match_group_id INTEGER,
      match_confidence REAL,
      is_primary_record INTEGER DEFAULT 0,
      tired_score INTEGER,
      btl_suitable INTEGER DEFAULT 0,
      r2r_suitable INTEGER DEFAULT 0,
      data_signals_count INTEGER DEFAULT 0,
      email TEXT,
      phone TEXT,
      linkedin_url TEXT,
      mailing_address TEXT,
      enrichment_source TEXT,
      enrichment_date TEXT,
      director_names TEXT,
      UNIQUE(company_number)
    );

    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landlord_id INTEGER REFERENCES landlords(id),
      uprn TEXT,
      address TEXT NOT NULL,
      postcode TEXT NOT NULL,
      current_energy_rating TEXT,
      property_type TEXT,
      tenure TEXT,
      transaction_type TEXT,
      lodgement_date TEXT,
      certificate_number TEXT,
      source TEXT NOT NULL,
      source_ref TEXT,
      scraped_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      listing_url TEXT,
      void_days INTEGER,
      listing_quality_score INTEGER,
      hmo_licence_number TEXT,
      title_number TEXT
    );
  `);

  return { db, dbPath };
}

function insertLandlord(db, opts) {
  const {
    name, entity_type = 'unknown', company_number = null, source = 'test',
    tired_score = 0, btl_suitable = 0, r2r_suitable = 0,
    email = null, phone = null, linkedin_url = null,
    mailing_address = null, enrichment_source = null, director_names = null,
    match_group_id = null, is_primary_record = 0,
  } = opts;
  return db.prepare(
    `INSERT INTO landlords (name, entity_type, company_number, source, tired_score, btl_suitable, r2r_suitable, email, phone, linkedin_url, mailing_address, enrichment_source, director_names, match_group_id, is_primary_record, scraped_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(name, entity_type, company_number, source, tired_score, btl_suitable, r2r_suitable, email, phone, linkedin_url, mailing_address, enrichment_source, director_names, match_group_id, is_primary_record).lastInsertRowid;
}

function insertProperty(db, opts) {
  const {
    landlord_id, address, postcode, current_energy_rating = null,
    void_days = null, source = 'test',
  } = opts;
  return db.prepare(
    `INSERT INTO properties (landlord_id, address, postcode, current_energy_rating, void_days, source, scraped_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(landlord_id, address, postcode, current_energy_rating, void_days, source).lastInsertRowid;
}

// ============================================================
// Data transformation tests
// ============================================================

const {
  queryLeads,
  buildNotionProperties,
  buildNotes,
  deriveLeadType,
  worstEPC,
  calculateFollowUpDate,
} = require('../export-notion');

describe('deriveLeadType', () => {
  it('BTL only', () => {
    assert.equal(deriveLeadType(1, 0), 'BTL');
  });
  it('R2R only', () => {
    assert.equal(deriveLeadType(0, 1), 'R2R');
  });
  it('both BTL and R2R', () => {
    assert.equal(deriveLeadType(1, 1), 'BTL + R2R');
  });
  it('neither', () => {
    assert.equal(deriveLeadType(0, 0), 'Unclassified');
  });
});

describe('worstEPC', () => {
  it('picks G from mixed ratings', () => {
    assert.equal(worstEPC('C,D,G,B'), 'G');
  });
  it('picks F when no G', () => {
    assert.equal(worstEPC('A,B,F,D'), 'F');
  });
  it('returns null for empty/null input', () => {
    assert.equal(worstEPC(null), null);
    assert.equal(worstEPC(''), null);
  });
  it('handles single rating', () => {
    assert.equal(worstEPC('D'), 'D');
  });
});

describe('calculateFollowUpDate', () => {
  it('returns a date 3 days from now in YYYY-MM-DD format', () => {
    const result = calculateFollowUpDate();
    const expected = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    assert.equal(result, expected);
  });
});

describe('buildNotionProperties', () => {
  it('builds correct Notion property object for a BTL landlord', () => {
    const landlord = {
      name: 'ACME PROPERTY LTD',
      tired_score: 75,
      btl_suitable: 1,
      r2r_suitable: 0,
      entity_type: 'ltd',
      property_count: 3,
      epc_ratings: 'D,F',
      max_void_days: 45,
      email: 'info@acme.co.uk',
      phone: '07700900000',
      mailing_address: '10 High St, Stockport SK1 1AA',
      enrichment_source: 'companies-house',
      director_names: 'John Smith, Jane Doe',
      company_number: '12345678',
      linkedin_url: 'https://linkedin.com/company/acme',
    };

    const props = buildNotionProperties(landlord);

    assert.equal(props['Lead'].title[0].text.content, 'ACME PROPERTY LTD');
    assert.equal(props['Score'].number, 75);
    assert.equal(props['Status'].status.name, 'New');
    assert.equal(props['Source'].select.name, 'Cold outreach');
    assert.equal(props['Lead Type'].select.name, 'BTL');
    assert.equal(props['BTL Suitable'].checkbox, true);
    assert.equal(props['R2R Suitable'].checkbox, false);
    assert.equal(props['Entity Type'].select.name, 'ltd');
    assert.equal(props['Property Count'].number, 3);
    assert.equal(props['EPC Rating'].select.name, 'F');
    assert.equal(props['Void Days'].number, 45);
    assert.equal(props['Email'].email, 'info@acme.co.uk');
    assert.equal(props['Phone'].phone_number, '07700900000');
    assert.equal(props['Contact Name'].rich_text[0].text.content, 'John Smith, Jane Doe');
    assert.equal(props['Company'].rich_text[0].text.content, '12345678');
    assert.equal(props['LinkedIn'].url, 'https://linkedin.com/company/acme');
    assert.equal(props['Next Follow-up'].date.start, calculateFollowUpDate());
    assert.ok(props['Notes'].rich_text[0].text.content.includes('Score: 75/100'));
  });

  it('handles null/missing optional fields gracefully', () => {
    const landlord = {
      name: 'SOLO LANDLORD',
      tired_score: 55,
      btl_suitable: 0,
      r2r_suitable: 0,
      entity_type: 'individual',
      property_count: 1,
      epc_ratings: null,
      max_void_days: null,
      email: null,
      phone: null,
      mailing_address: null,
      enrichment_source: null,
      director_names: null,
      company_number: null,
      linkedin_url: null,
    };

    const props = buildNotionProperties(landlord);

    assert.equal(props['Lead Type'].select.name, 'Unclassified');
    assert.equal(props['Email'].email, null);
    assert.equal(props['Phone'].phone_number, null);
    assert.equal(props['Void Days'].number, 0);
    assert.equal(props['LinkedIn'].url, null);
  });
});

describe('queryLeads', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());

    // Insert landlords with various scores
    const id1 = insertLandlord(db, { name: 'HIGH SCORE LTD', entity_type: 'ltd', tired_score: 85, btl_suitable: 1, r2r_suitable: 1, email: 'high@test.com', source: 'test' });
    const id2 = insertLandlord(db, { name: 'MID SCORE', entity_type: 'individual', tired_score: 55, btl_suitable: 1, r2r_suitable: 0, source: 'test' });
    const id3 = insertLandlord(db, { name: 'LOW SCORE', entity_type: 'individual', tired_score: 30, source: 'test' });
    const id4 = insertLandlord(db, { name: 'EXACT 50', entity_type: 'individual', tired_score: 50, btl_suitable: 0, r2r_suitable: 1, source: 'test' });

    // Duplicate (non-primary) — should be excluded
    const id5 = insertLandlord(db, { name: 'DUPLICATE', entity_type: 'individual', tired_score: 90, match_group_id: 1, is_primary_record: 0, source: 'test' });

    // Properties
    insertProperty(db, { landlord_id: id1, address: '1 High St', postcode: 'SK1 1AA', current_energy_rating: 'F', void_days: 60 });
    insertProperty(db, { landlord_id: id1, address: '2 Low Rd', postcode: 'SK2 2BB', current_energy_rating: 'D', void_days: 20 });
    insertProperty(db, { landlord_id: id2, address: '3 Mid Ave', postcode: 'SK3 3CC', current_energy_rating: 'C' });
    insertProperty(db, { landlord_id: id4, address: '4 Edge Ln', postcode: 'SK4 4DD', current_energy_rating: 'G', void_days: 10 });
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('only returns landlords with tired_score >= 50', () => {
    const leads = queryLeads(db, 50);
    const names = leads.map(l => l.name);
    assert.ok(names.includes('HIGH SCORE LTD'));
    assert.ok(names.includes('MID SCORE'));
    assert.ok(names.includes('EXACT 50'));
    assert.ok(!names.includes('LOW SCORE'));
  });

  it('excludes non-primary duplicates', () => {
    const leads = queryLeads(db, 50);
    const names = leads.map(l => l.name);
    assert.ok(!names.includes('DUPLICATE'));
  });

  it('aggregates property count correctly', () => {
    const leads = queryLeads(db, 50);
    const high = leads.find(l => l.name === 'HIGH SCORE LTD');
    assert.equal(high.property_count, 2);
  });

  it('aggregates EPC ratings as comma-separated string', () => {
    const leads = queryLeads(db, 50);
    const high = leads.find(l => l.name === 'HIGH SCORE LTD');
    assert.ok(high.epc_ratings.includes('F'));
    assert.ok(high.epc_ratings.includes('D'));
  });

  it('takes max void days from properties', () => {
    const leads = queryLeads(db, 50);
    const high = leads.find(l => l.name === 'HIGH SCORE LTD');
    assert.equal(high.max_void_days, 60);
  });

  it('orders by tired_score DESC', () => {
    const leads = queryLeads(db, 50);
    for (let i = 1; i < leads.length; i++) {
      assert.ok(leads[i - 1].tired_score >= leads[i].tired_score,
        `Expected ${leads[i - 1].name} (${leads[i - 1].tired_score}) >= ${leads[i].name} (${leads[i].tired_score})`);
    }
  });
});

describe('dry run mode', () => {
  let db, dbPath, exportsDir;

  before(() => {
    ({ db, dbPath } = createTestDb());
    exportsDir = path.join(os.tmpdir(), `test-notion-exports-${Date.now()}`);
    fs.mkdirSync(exportsDir, { recursive: true });

    insertLandlord(db, { name: 'DRY RUN LEAD', tired_score: 60, btl_suitable: 1, source: 'test' });
    insertProperty(db, { landlord_id: 1, address: '1 Test St', postcode: 'SK1 1AA', current_energy_rating: 'E' });
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
    try { fs.rmSync(exportsDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('writes JSON file in dry run mode', async () => {
    const { exportToNotion } = require('../export-notion');
    const result = await exportToNotion(db, { minScore: 50, dryRun: true, exportsDir });
    assert.ok(result.dryRunFile, 'Should return dryRunFile path');
    assert.ok(fs.existsSync(result.dryRunFile), 'Dry run JSON file should exist');
    const data = JSON.parse(fs.readFileSync(result.dryRunFile, 'utf8'));
    assert.ok(Array.isArray(data), 'Dry run output should be an array');
    assert.ok(data.length > 0, 'Dry run output should have entries');
  });

  it('produces CSV backup in dry run mode', async () => {
    const { exportToNotion } = require('../export-notion');
    const result = await exportToNotion(db, { minScore: 50, dryRun: true, exportsDir });
    assert.ok(result.csvBackupFile, 'Should return csvBackupFile path');
    assert.ok(fs.existsSync(result.csvBackupFile), 'CSV backup should exist');
  });
});
