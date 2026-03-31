const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Helper to create a temp DB with full schema + Phase 2 + Phase 3 migrations
function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-suppression-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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
  const phase2 = [
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
  for (const sql of phase2) {
    try { db.exec(sql); } catch (e) {
      if (!e.message.includes('duplicate column name')) throw e;
    }
  }

  // Phase 3 migrations
  const { runMigration: runPhase3 } = require('../migrate-phase3');
  runPhase3(db);

  return { db, dbPath };
}

function insertLandlord(db, { name, entity_type = 'unknown', company_number = null, source = 'test', tired_score = 50 }) {
  return db.prepare(
    `INSERT INTO landlords (name, entity_type, company_number, source, tired_score, scraped_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).run(name, entity_type, company_number, source, tired_score).lastInsertRowid;
}

// ============================================================
// Migration tests
// ============================================================

describe('migrate-phase4', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
  });

  after(() => {
    db.close();
  });

  it('adds suppressed, suppressed_date, suppressed_reason columns', () => {
    const { runMigration } = require('../migrate-phase4');
    runMigration(db);

    // Verify columns exist by inserting a row that uses them
    const id = insertLandlord(db, { name: 'TEST MIGRATION LTD', entity_type: 'ltd' });
    db.prepare('UPDATE landlords SET suppressed = 1, suppressed_date = ?, suppressed_reason = ? WHERE id = ?')
      .run('2026-01-01T00:00:00Z', 'test reason', id);

    const row = db.prepare('SELECT suppressed, suppressed_date, suppressed_reason FROM landlords WHERE id = ?').get(id);
    assert.equal(row.suppressed, 1);
    assert.equal(row.suppressed_date, '2026-01-01T00:00:00Z');
    assert.equal(row.suppressed_reason, 'test reason');
  });

  it('is idempotent — running twice does not error', () => {
    const { runMigration } = require('../migrate-phase4');
    // Already ran once above; run again
    assert.doesNotThrow(() => runMigration(db));
  });

  it('suppressed column defaults to 0', () => {
    const id = insertLandlord(db, { name: 'DEFAULT CHECK LTD', entity_type: 'ltd' });
    const row = db.prepare('SELECT suppressed FROM landlords WHERE id = ?').get(id);
    assert.equal(row.suppressed, 0);
  });
});

// ============================================================
// suppress-lead CLI tests
// ============================================================

describe('suppressLead', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
    const { runMigration } = require('../migrate-phase4');
    runMigration(db);
  });

  after(() => {
    db.close();
  });

  it('sets suppressed=1, suppressed_date, and suppressed_reason', () => {
    const id = insertLandlord(db, { name: 'SUPPRESS ME LTD', entity_type: 'ltd' });
    const { suppressLead } = require('../suppress-lead');

    const changes = suppressLead(db, id, 'Replied STOP');
    assert.equal(changes, 1);

    const row = db.prepare('SELECT suppressed, suppressed_date, suppressed_reason FROM landlords WHERE id = ?').get(id);
    assert.equal(row.suppressed, 1);
    assert.ok(row.suppressed_date, 'Should have suppressed_date set');
    assert.equal(row.suppressed_reason, 'Replied STOP');
  });

  it('returns 0 changes for non-existent ID', () => {
    const { suppressLead } = require('../suppress-lead');
    const changes = suppressLead(db, 999999, 'Does not exist');
    assert.equal(changes, 0);
  });
});

// ============================================================
// export-filters tests
// ============================================================

describe('export-filters', () => {
  let db, dbPath;

  before(() => {
    ({ db, dbPath } = createTestDb());
    const { runMigration } = require('../migrate-phase4');
    runMigration(db);

    // Seed test data with varying entity types and suppression states
    // Active Ltd company
    insertLandlord(db, { name: 'ACTIVE LTD CO', entity_type: 'ltd', tired_score: 80 });
    // Active LLP company
    insertLandlord(db, { name: 'ACTIVE LLP CO', entity_type: 'llp', tired_score: 70 });
    // Active individual
    insertLandlord(db, { name: 'John Smith', entity_type: 'individual', tired_score: 60 });
    // Active unknown entity
    insertLandlord(db, { name: 'MYSTERY LANDLORD', entity_type: 'unknown', tired_score: 55 });
    // Active null entity (use default which is 'unknown' from schema, so we update it)
    const nullId = insertLandlord(db, { name: 'NULL ENTITY', entity_type: 'unknown', tired_score: 50 });
    db.prepare('UPDATE landlords SET entity_type = NULL WHERE id = ?').run(nullId);
    // Suppressed Ltd
    const suppId = insertLandlord(db, { name: 'SUPPRESSED LTD', entity_type: 'ltd', tired_score: 90 });
    db.prepare('UPDATE landlords SET suppressed = 1, suppressed_date = ?, suppressed_reason = ? WHERE id = ?')
      .run('2026-01-01T00:00:00Z', 'Opted out', suppId);
  });

  after(() => {
    db.close();
  });

  it('suppressionFilter() returns correct SQL fragment', () => {
    const { suppressionFilter } = require('../lib/export-filters');
    assert.equal(suppressionFilter(), '(suppressed = 0 OR suppressed IS NULL)');
  });

  it('pecrEmailGate() returns correct SQL fragment', () => {
    const { pecrEmailGate } = require('../lib/export-filters');
    assert.equal(pecrEmailGate(), "entity_type IN ('ltd', 'llp')");
  });

  it('getFilteredLeads email channel excludes suppressed AND non-Ltd/LLP', () => {
    const { getFilteredLeads } = require('../lib/export-filters');
    const leads = getFilteredLeads(db, { channel: 'email' });

    const names = leads.map(l => l.name);
    // Should include ONLY active Ltd and LLP
    assert.ok(names.includes('ACTIVE LTD CO'), 'Should include active Ltd');
    assert.ok(names.includes('ACTIVE LLP CO'), 'Should include active LLP');
    // Should exclude individual, unknown, null entity, and suppressed
    assert.ok(!names.includes('John Smith'), 'Should exclude individual');
    assert.ok(!names.includes('MYSTERY LANDLORD'), 'Should exclude unknown');
    assert.ok(!names.includes('NULL ENTITY'), 'Should exclude null entity');
    assert.ok(!names.includes('SUPPRESSED LTD'), 'Should exclude suppressed');
  });

  it('getFilteredLeads mail channel excludes suppressed but includes ALL entity types', () => {
    const { getFilteredLeads } = require('../lib/export-filters');
    const leads = getFilteredLeads(db, { channel: 'mail' });

    const names = leads.map(l => l.name);
    // Should include all active leads regardless of entity type
    assert.ok(names.includes('ACTIVE LTD CO'), 'Should include active Ltd');
    assert.ok(names.includes('ACTIVE LLP CO'), 'Should include active LLP');
    assert.ok(names.includes('John Smith'), 'Should include individual');
    assert.ok(names.includes('MYSTERY LANDLORD'), 'Should include unknown');
    assert.ok(names.includes('NULL ENTITY'), 'Should include null entity');
    // Should exclude suppressed
    assert.ok(!names.includes('SUPPRESSED LTD'), 'Should exclude suppressed');
  });

  it('getFilteredLeads phone channel excludes suppressed but includes ALL entity types', () => {
    const { getFilteredLeads } = require('../lib/export-filters');
    const leads = getFilteredLeads(db, { channel: 'phone' });

    const names = leads.map(l => l.name);
    assert.ok(names.includes('ACTIVE LTD CO'));
    assert.ok(names.includes('John Smith'));
    assert.ok(!names.includes('SUPPRESSED LTD'));
  });

  it('email export does NOT include individual, unknown, or NULL entity types', () => {
    const { getFilteredLeads } = require('../lib/export-filters');
    const leads = getFilteredLeads(db, { channel: 'email' });

    for (const lead of leads) {
      assert.ok(
        lead.entity_type === 'ltd' || lead.entity_type === 'llp',
        `Email export should only contain ltd/llp, found: ${lead.entity_type} (${lead.name})`
      );
    }
  });

  it('suppressed lead (suppressed=1) does not appear in any channel export', () => {
    const { getFilteredLeads } = require('../lib/export-filters');

    for (const channel of ['email', 'mail', 'phone', 'linkedin']) {
      const leads = getFilteredLeads(db, { channel });
      const names = leads.map(l => l.name);
      assert.ok(
        !names.includes('SUPPRESSED LTD'),
        `Suppressed lead should not appear in ${channel} channel`
      );
    }
  });

  it('getFilteredLeads respects minScore filter', () => {
    const { getFilteredLeads } = require('../lib/export-filters');
    const leads = getFilteredLeads(db, { channel: 'mail', minScore: 70 });

    for (const lead of leads) {
      assert.ok(lead.tired_score >= 70, `Expected score >= 70, got ${lead.tired_score}`);
    }
    // Should include the 80 and 70 score leads but not 60, 55, 50
    assert.ok(leads.length >= 2, `Expected at least 2 leads with score >= 70, got ${leads.length}`);
  });
});
