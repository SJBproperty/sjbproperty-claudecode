const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const {
  isServiceAddress,
  extractEmails,
  enrichCHOfficers,
  enrichCHFilings,
  enrichMailFallback,
  enrichContacts,
} = require('../enrich-contacts');

// Helper to create a temp DB with full schema including Phase 3 columns
function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-enrichment-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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
      btl_suitable INTEGER,
      r2r_suitable INTEGER,
      data_signals_count INTEGER,
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

function insertLandlord(db, { name, entity_type = 'unknown', company_number = null, source = 'test', tired_score = 0, email = null, director_names = null, mailing_address = null }) {
  return db.prepare(
    `INSERT INTO landlords (name, entity_type, company_number, source, tired_score, email, director_names, mailing_address, scraped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(name, entity_type, company_number, source, tired_score, email, director_names, mailing_address).lastInsertRowid;
}

function insertProperty(db, { landlord_id, address, postcode, source = 'test' }) {
  return db.prepare(
    `INSERT INTO properties (landlord_id, address, postcode, source, scraped_at) VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(landlord_id, address, postcode, source).lastInsertRowid;
}

// ============================================================
// Service address detection
// ============================================================

describe('isServiceAddress', () => {
  it('detects accountant addresses', () => {
    assert.equal(isServiceAddress('ABC Accountants Ltd, 123 High St'), true);
  });

  it('detects formations agent addresses', () => {
    assert.equal(isServiceAddress('Quick Formations, Suite 5, London'), true);
  });

  it('detects virtual office addresses', () => {
    assert.equal(isServiceAddress('Regus Virtual Office, 10 Fleet St'), true);
  });

  it('returns false for normal residential addresses', () => {
    assert.equal(isServiceAddress('45 Oak Road, Stockport, SK1 3AA'), false);
  });

  it('returns false for null/empty', () => {
    assert.equal(isServiceAddress(null), false);
    assert.equal(isServiceAddress(''), false);
  });
});

// ============================================================
// Email extraction
// ============================================================

describe('extractEmails', () => {
  it('extracts emails from text', () => {
    const emails = extractEmails('Contact john@example.co.uk or mary@landlords.com');
    assert.ok(emails.includes('john@example.co.uk'));
    assert.ok(emails.includes('mary@landlords.com'));
  });

  it('filters out gov.uk and companieshouse emails', () => {
    const emails = extractEmails('Email admin@companieshouse.gov.uk or noreply@test.com');
    assert.equal(emails.length, 0);
  });

  it('returns empty for null/no matches', () => {
    assert.deepEqual(extractEmails(null), []);
    assert.deepEqual(extractEmails('no emails here'), []);
  });

  it('deduplicates emails', () => {
    const emails = extractEmails('sam@test.com and sam@test.com again');
    assert.equal(emails.length, 1);
  });
});

// ============================================================
// CH Officer enrichment
// ============================================================

describe('enrichCHOfficers', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('extracts active directors from mock CH response', async () => {
    const id = insertLandlord(db, {
      name: 'TEST PROPERTY LTD',
      entity_type: 'ltd',
      company_number: '11111111',
      tired_score: 80,
    });

    const mockFetch = async (url) => ({
      items: [
        { name: 'SMITH, John', resigned_on: null, address: { address_line_1: '45 Oak Road', locality: 'Stockport', postal_code: 'SK1 3AA' } },
        { name: 'DOE, Jane', resigned_on: '2023-01-01', address: { address_line_1: '10 Elm St', locality: 'Manchester' } },
      ],
    });

    const stats = await enrichCHOfficers(db, { minScore: 50, fetchFn: mockFetch });
    assert.equal(stats.looked, 1);

    const landlord = db.prepare('SELECT director_names, mailing_address FROM landlords WHERE id = ?').get(id);
    assert.equal(landlord.director_names, 'SMITH, John');
    assert.ok(landlord.mailing_address.includes('Oak Road'));
  });

  it('flags service addresses and leaves mailing_address NULL', async () => {
    const id = insertLandlord(db, {
      name: 'SERVICE ADDRESS LTD',
      entity_type: 'ltd',
      company_number: '22222222',
      tired_score: 70,
    });

    const mockFetch = async (url) => ({
      items: [
        { name: 'JONES, Bob', resigned_on: null, address: { address_line_1: 'ABC Accountants Ltd', address_line_2: '123 High St', locality: 'London' } },
      ],
    });

    const stats = await enrichCHOfficers(db, { minScore: 50, fetchFn: mockFetch });
    assert.equal(stats.serviceAddresses, 1);

    const landlord = db.prepare('SELECT director_names, mailing_address FROM landlords WHERE id = ?').get(id);
    assert.equal(landlord.director_names, 'JONES, Bob');
    assert.equal(landlord.mailing_address, null);
  });
});

// ============================================================
// CH Filing email extraction
// ============================================================

describe('enrichCHFilings', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('extracts email from filing description', async () => {
    const id = insertLandlord(db, {
      name: 'FILING EMAIL LTD',
      entity_type: 'ltd',
      company_number: '33333333',
      tired_score: 90,
    });

    const mockFetch = async (url) => ({
      items: [
        { description: 'Confirmation statement made with contact email landlord@property.co.uk' },
      ],
    });

    const stats = await enrichCHFilings(db, { minScore: 50, fetchFn: mockFetch });
    assert.equal(stats.found, 1);

    const landlord = db.prepare('SELECT email, enrichment_source FROM landlords WHERE id = ?').get(id);
    assert.equal(landlord.email, 'landlord@property.co.uk');
    assert.equal(landlord.enrichment_source, 'ch-filing');
  });

  it('skips landlords that already have email', async () => {
    insertLandlord(db, {
      name: 'ALREADY HAS EMAIL LTD',
      entity_type: 'ltd',
      company_number: '44444444',
      tired_score: 85,
      email: 'existing@test.com',
    });

    const mockFetch = async (url) => ({
      items: [{ description: 'Contact new@email.com' }],
    });

    const stats = await enrichCHFilings(db, { minScore: 50, fetchFn: mockFetch });
    // Should not find anything new (already has email query filters it out)
    const landlord = db.prepare("SELECT email FROM landlords WHERE company_number = '44444444'").get();
    assert.equal(landlord.email, 'existing@test.com');
  });
});

// ============================================================
// Mailing address fallback
// ============================================================

describe('enrichMailFallback', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('sets mailing address from property address when registered office unavailable', () => {
    const id = insertLandlord(db, {
      name: 'NO ADDRESS LANDLORD',
      entity_type: 'individual',
      tired_score: 75,
    });
    insertProperty(db, { landlord_id: id, address: '99 Test Street', postcode: 'SK2 5AB' });

    const stats = enrichMailFallback(db, { minScore: 50 });
    assert.equal(stats.set, 1);

    const landlord = db.prepare('SELECT mailing_address FROM landlords WHERE id = ?').get(id);
    assert.equal(landlord.mailing_address, '99 Test Street, SK2 5AB');
  });

  it('does not overwrite existing mailing address', () => {
    const id = insertLandlord(db, {
      name: 'HAS ADDRESS LANDLORD',
      entity_type: 'individual',
      tired_score: 60,
      mailing_address: 'Existing Address',
    });
    insertProperty(db, { landlord_id: id, address: '100 Other Street', postcode: 'SK3 6CD' });

    const stats = enrichMailFallback(db, { minScore: 50 });

    const landlord = db.prepare('SELECT mailing_address FROM landlords WHERE id = ?').get(id);
    assert.equal(landlord.mailing_address, 'Existing Address');
  });
});

// ============================================================
// Enrichment ordering
// ============================================================

describe('enrichment ordering', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('processes highest tired_score first', async () => {
    insertLandlord(db, { name: 'LOW SCORE LTD', entity_type: 'ltd', company_number: '55555555', tired_score: 55 });
    insertLandlord(db, { name: 'HIGH SCORE LTD', entity_type: 'ltd', company_number: '66666666', tired_score: 95 });

    const fetchOrder = [];
    const mockFetch = async (url) => {
      // Extract company number from URL to track order
      const match = url.match(/company\/(\d+)/);
      if (match) fetchOrder.push(match[1]);
      return { items: [] };
    };

    await enrichCHOfficers(db, { minScore: 50, fetchFn: mockFetch });

    // High score should be processed first
    assert.equal(fetchOrder[0], '66666666');
    assert.equal(fetchOrder[1], '55555555');
  });
});

// ============================================================
// Tier filtering
// ============================================================

describe('tier filtering', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
  });

  after(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('--tier=ch-officers only runs CH officer lookup', async () => {
    insertLandlord(db, { name: 'TIER TEST LTD', entity_type: 'ltd', company_number: '77777777', tired_score: 80 });

    const mockFetch = async () => ({ items: [] });
    const stats = await enrichContacts(db, { tier: 'ch-officers', minScore: 50, fetchFn: mockFetch });

    assert.ok(stats.chOfficers !== undefined, 'should have chOfficers stats');
    assert.equal(stats.chFilings, undefined, 'should NOT have chFilings stats');
    assert.equal(stats.snov, undefined, 'should NOT have snov stats');
  });

  it('--tier=mail-fallback only runs mailing address fallback', async () => {
    const stats = await enrichContacts(db, { tier: 'mail-fallback', minScore: 50 });

    assert.ok(stats.mailFallback !== undefined, 'should have mailFallback stats');
    assert.equal(stats.chOfficers, undefined, 'should NOT have chOfficers stats');
  });
});
