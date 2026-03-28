const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

const TEST_DB_PATH = path.join(os.tmpdir(), `test-ch-${Date.now()}.db`);

describe('Companies House scraper', () => {
  let db;
  let ch;

  before(() => {
    // Create temp database with landlords schema
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
    `);

    ch = require('../companies-house');
  });

  after(() => {
    if (db) db.close();
    try { fs.unlinkSync(TEST_DB_PATH); } catch (e) { /* ignore */ }
  });

  it('Test 1: classifyEntityType maps company_type correctly', () => {
    assert.strictEqual(ch.classifyEntityType('ltd'), 'ltd');
    assert.strictEqual(ch.classifyEntityType('llp'), 'llp');
    assert.strictEqual(ch.classifyEntityType('plc'), 'ltd');
    assert.strictEqual(ch.classifyEntityType('private-limited-guarant-nsc'), 'ltd');
    assert.strictEqual(ch.classifyEntityType('private-limited-guarant-nsc-limited-exemption'), 'ltd');
    assert.strictEqual(ch.classifyEntityType('private-unlimited'), 'ltd');
    assert.strictEqual(ch.classifyEntityType('some-other-type'), 'unknown');
    assert.strictEqual(ch.classifyEntityType(undefined), 'unknown');
    assert.strictEqual(ch.classifyEntityType(null), 'unknown');
  });

  it('Test 2: buildSearchURL constructs correct URL with sic_codes and company_status=active', () => {
    const url = ch.buildSearchURL('Stockport', 0);
    assert.ok(url.includes('sic_codes=68100%2C68209%2C68320') || url.includes('sic_codes=68100,68209,68320'), 'URL must include all 3 SIC codes');
    assert.ok(url.includes('company_status=active'), 'URL must filter to active companies');
    assert.ok(url.includes('location=Stockport'), 'URL must include location');
    assert.ok(url.includes('size=100'), 'URL must request 100 results per page');
    assert.ok(url.includes('start_index=0'), 'URL must include start_index');
    assert.ok(url.includes('advanced-search/companies'), 'URL must use advanced-search endpoint');
  });

  it('Test 3: parseCompany extracts fields from API response item', () => {
    const apiItem = {
      company_name: 'STOCKPORT PROPERTY SPV LTD',
      company_number: '12345678',
      company_type: 'ltd',
      registered_office_address: {
        address_line_1: '10 High Street',
        address_line_2: 'Suite 5',
        locality: 'Stockport',
        region: 'Greater Manchester',
        postal_code: 'SK1 1AA',
        country: 'United Kingdom',
      },
      sic_codes: ['68209'],
    };

    const parsed = ch.parseCompany(apiItem);
    assert.strictEqual(parsed.company_name, 'STOCKPORT PROPERTY SPV LTD');
    assert.strictEqual(parsed.company_number, '12345678');
    assert.strictEqual(parsed.company_type, 'ltd');
    assert.strictEqual(parsed.sic_codes, '68209');
    assert.ok(parsed.registered_address.includes('10 High Street'), 'Address must include address_line_1');
    assert.ok(parsed.registered_address.includes('Stockport'), 'Address must include locality');
    assert.ok(parsed.registered_address.includes('SK1 1AA'), 'Address must include postal_code');
  });

  it('Test 4: insertLandlord uses INSERT OR IGNORE on company_number unique constraint', () => {
    const company = {
      company_name: 'TEST PROPERTY LTD',
      company_number: 'TEST0001',
      company_type: 'ltd',
      registered_address: '1 Test St, Stockport, SK1 1AA',
      sic_codes: '68209',
    };

    // Insert once
    const result1 = ch.insertLandlord(db, company);
    assert.strictEqual(result1, true, 'First insert should succeed');

    // Insert same company_number again
    const result2 = ch.insertLandlord(db, company);
    assert.strictEqual(result2, false, 'Second insert with same company_number should be ignored');

    // Verify only 1 row in DB
    const total = db.prepare('SELECT COUNT(*) as cnt FROM landlords WHERE company_number = ?').get('TEST0001');
    assert.strictEqual(total.cnt, 1, 'Database should contain exactly 1 row for the company_number');
  });

  it('Test 5: Rate limiter tracks requests and detects when limit approached', () => {
    // The rate limiter should expose a way to check current count
    const limiter = ch.createRateLimiter(600, 300000); // 600 req per 5 min

    // Simulate adding request timestamps
    const now = Date.now();
    for (let i = 0; i < 550; i++) {
      limiter.recordRequest(now);
    }

    assert.strictEqual(limiter.shouldWait(now), true, 'Should wait when 550+ requests in window');
    assert.strictEqual(limiter.getCount(now), 550, 'Count should be 550');

    // With only a few requests, should not wait
    const limiter2 = ch.createRateLimiter(600, 300000);
    limiter2.recordRequest(now);
    limiter2.recordRequest(now);
    assert.strictEqual(limiter2.shouldWait(now), false, 'Should not wait with only 2 requests');
  });

  it('Test 6: formatAddress concatenates registered_office_address fields correctly', () => {
    const fullAddress = {
      address_line_1: '10 High Street',
      address_line_2: 'Suite 5',
      locality: 'Stockport',
      region: 'Greater Manchester',
      postal_code: 'SK1 1AA',
      country: 'United Kingdom',
    };

    const formatted = ch.formatAddress(fullAddress);
    assert.strictEqual(formatted, '10 High Street, Suite 5, Stockport, Greater Manchester, SK1 1AA, United Kingdom');

    // With null/missing fields
    const partialAddress = {
      address_line_1: '10 High Street',
      address_line_2: null,
      locality: 'Stockport',
      postal_code: 'SK1 1AA',
    };

    const formattedPartial = ch.formatAddress(partialAddress);
    assert.strictEqual(formattedPartial, '10 High Street, Stockport, SK1 1AA');

    // With empty/undefined object
    assert.strictEqual(ch.formatAddress(null), '');
    assert.strictEqual(ch.formatAddress(undefined), '');
    assert.strictEqual(ch.formatAddress({}), '');
  });

  it('Test 4b: insertLandlord sets source=companies_house and scraped_at to ISO 8601', () => {
    const company = {
      company_name: 'SOURCE TEST LTD',
      company_number: 'TEST0002',
      company_type: 'llp',
      registered_address: '2 Test St, Manchester, M14 5AA',
      sic_codes: '68100,68320',
    };

    ch.insertLandlord(db, company);

    const row = db.prepare('SELECT source, source_ref, scraped_at, entity_type FROM landlords WHERE company_number = ?').get('TEST0002');
    assert.strictEqual(row.source, 'companies_house', 'source must be companies_house');
    assert.strictEqual(row.source_ref, 'TEST0002', 'source_ref must be company_number');
    assert.strictEqual(row.entity_type, 'llp', 'entity_type must be llp for llp company_type');
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(row.scraped_at), `scraped_at must be ISO 8601, got: ${row.scraped_at}`);
  });
});
