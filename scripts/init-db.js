const db = require('./lib/db');

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
    suppressed INTEGER DEFAULT 0,
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

  CREATE INDEX IF NOT EXISTS idx_properties_postcode ON properties(postcode);
  CREATE INDEX IF NOT EXISTS idx_properties_rating ON properties(current_energy_rating);
  CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id);
  CREATE INDEX IF NOT EXISTS idx_landlords_entity_type ON landlords(entity_type);
  CREATE INDEX IF NOT EXISTS idx_landlords_company_number ON landlords(company_number);
`);

console.log('Database initialised at data/sjb-leads.db');
