# Phase 2: Data Sources & Deduplication - Research

**Researched:** 2026-03-28
**Domain:** Data ingestion (CSV/web scraping), record deduplication, fuzzy matching
**Confidence:** MEDIUM-HIGH

## Summary

Phase 2 ingests four new data sources (Land Registry CCOD, OpenRent via Apify, Council HMO registers, Rightmove/Zoopla via Apify) into the existing SQLite database, then deduplicates all landlord records across all sources into unified profiles. The existing schema from Phase 1 (landlords + properties tables) needs column additions for new source-specific fields (HMO licence number, title number, listing URL, void period data). The deduplication logic combines exact matching (company number, UPRN) with fuzzy name matching using Fuse.js, plus address normalisation via the `postcode` npm package.

The CCOD dataset is a free bulk CSV download from HM Land Registry containing all corporate-owned property titles in England and Wales -- filtering to target postcodes is done post-download in code. OpenRent and Rightmove/Zoopla scraping uses Apify Actors called via the existing Apify MCP integration. HMO register parsing is standalone Node.js reading local CSV/XLSX files. The final step produces four date-stamped CSV exports for downstream use.

**Primary recommendation:** Build each data source importer as an independent script following the Phase 1 pattern (require dotenv, use shared db.js and config.js), then build a separate deduplication script and export script. Schema migration should happen first as a standalone script.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Land Registry CCOD:** Script auto-downloads the free bulk CSV from Land Registry, parses, and imports corporate-owned titles in target postcodes
- **OpenRent:** Apify Actor via Claude MCP orchestration -- captures self-managing landlords with listing quality and void period data in target areas
- **Council HMO registers:** Parse existing CSV files Sam already has (Stockport and Manchester). FOI requests already submitted for fresh data -- script should handle both current dated files and future FOI responses
- **Rightmove/Zoopla:** Apify Actors via Claude MCP orchestration -- ToS risk accepted at this scale. If Actors get delisted, fall back to manual research. Used for void period analysis and listing quality scoring
- **Scraping workflow:** Claude MCP orchestration for all Apify Actor runs (not standalone scripts). HMO register parsing is standalone Node.js script
- **Deduplication rules:** Auto-merge on exact company number match OR name + same postcode. Flag uncertain fuzzy matches for manual review. Source priority: Companies House > EPC Register > all others
- **Output:** 4 date-stamped CSVs (all-leads, high-priority-leads, hmo-landlords, snov-io-import)
- **High priority definition:** Has identifiable landlord name or company number AND EPC rating D-G

### Claude's Discretion
- Exact fuzzy matching algorithm and confidence thresholds
- CSV export location within data/ directory (flat vs subfolder)
- CCOD download URL and parsing logic
- Rate limiting strategy for Apify Actor runs
- HMO register CSV column mapping (varies by council)
- Whether to install xlsx package now or wait for FOI Excel files

### Deferred Ideas (OUT OF SCOPE)
- Google Maps/Street View visual scoring -- belongs in its own phase
- Vibe Prospecting MCP for enrichment -- fits Phase 3 (INTEL-05)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Land Registry CCOD bulk download -- extract corporate-owned titles in target postcodes | CCOD is free CSV from use-land-property-data.service.gov.uk; ~3.5M rows nationally; filter by postcode in code; columns include Title Number, Tenure, Property Address, Proprietor Name, Company Registration No, County, District |
| DATA-02 | OpenRent scraper -- self-managing landlords with void periods and listing quality | Multiple Apify Actors available (vivid-softwares/openrent-scraper recommended); output includes landlord info, rent, availability, EPC; call via Apify MCP |
| DATA-03 | Council HMO licensing registers -- import existing dated register as baseline | Sam has local CSV files; use csv-parse for CSV and xlsx for XLSX; column mapping varies by council; script must be flexible |
| DATA-04 | Rightmove/Zoopla scraper -- listing data for void period analysis | Multiple Apify Actors available (dhrumil/rightmove-scraper, automation-lab/rightmove-scraper); ToS risk accepted; output includes price, address, listing date, description |
| INTEL-01 | Cross-source deduplication -- match landlord records using fuzzy name, address normalisation, UPRN, company number | Fuse.js for fuzzy name matching; postcode package for address normalisation; exact match on company_number and UPRN first, then fuzzy pass |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.8.0 | SQLite database | Already in use from Phase 1 |
| dotenv | 17.3.1 | Environment variables | Already in use from Phase 1 |
| xlsx | 0.18.5 | Parse Excel files | Already installed in package.json |

### New Dependencies
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fuse.js | 7.1.0 | Fuzzy name matching for deduplication | Most popular JS fuzzy search lib, zero dependencies, 12KB, supports weighted scoring and configurable thresholds |
| csv-parse | 6.2.1 | Parse CSV files (CCOD, HMO registers) | Part of csv-node ecosystem, streaming support, handles quoted fields and edge cases |
| csv-stringify | 6.7.0 | Write CSV exports | Companion to csv-parse, handles proper quoting and escaping |
| postcode | 5.1.0 | UK postcode parsing and normalisation | Validates, normalises, and extracts outcode/incode/area from UK postcodes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fuse.js | string-similarity (4.0.4) | string-similarity gives raw Dice coefficient scores but no search/indexing -- fuse.js better for searching a collection |
| csv-parse | papaparse | papaparse is browser-oriented; csv-parse is Node-native with streaming |
| postcode | uk-postcode | uk-postcode last published 11 years ago; postcode is actively maintained |

**Installation:**
```bash
npm install fuse.js csv-parse csv-stringify postcode
```

**Version verification:** All versions confirmed via `npm view` on 2026-03-28.

## Architecture Patterns

### Recommended Project Structure
```
scripts/
  import-ccod.js          # Land Registry CCOD CSV importer
  parse-hmo.js            # HMO register CSV/XLSX parser
  build-lead-list.js      # Deduplication + CSV export
  migrate-phase2.js       # Schema migration for new columns
  lib/
    db.js                 # Existing - reuse
    config.js             # Existing - extend with new constants
    normalise.js          # NEW: address normalisation helpers
    dedup.js              # NEW: deduplication logic (fuzzy matching, merge rules)
data/
  exports/                # CSV output directory
    all-leads-YYYY-MM-DD.csv
    high-priority-leads-YYYY-MM-DD.csv
    hmo-landlords-YYYY-MM-DD.csv
    snov-io-import-YYYY-MM-DD.csv
    review-matches-YYYY-MM-DD.csv
  hmo-registers/          # Local HMO register files (input)
```

### Pattern 1: Schema Migration Script
**What:** Standalone script that adds new columns to existing tables using ALTER TABLE
**When to use:** Before any data import scripts run
**Example:**
```javascript
// scripts/migrate-phase2.js
require('dotenv').config();
const db = require('./lib/db');

// Add new columns for Phase 2 data sources
const migrations = [
  `ALTER TABLE landlords ADD COLUMN hmo_licence_number TEXT`,
  `ALTER TABLE landlords ADD COLUMN ccod_title_numbers TEXT`,    // JSON array of title numbers
  `ALTER TABLE properties ADD COLUMN listing_url TEXT`,
  `ALTER TABLE properties ADD COLUMN void_days INTEGER`,
  `ALTER TABLE properties ADD COLUMN listing_quality_score INTEGER`,
  `ALTER TABLE properties ADD COLUMN hmo_licence_number TEXT`,
  `ALTER TABLE properties ADD COLUMN title_number TEXT`,
  `ALTER TABLE landlords ADD COLUMN match_group_id INTEGER`,     // dedup group
  `ALTER TABLE landlords ADD COLUMN match_confidence REAL`,      // 0.0-1.0
  `ALTER TABLE landlords ADD COLUMN is_primary_record INTEGER DEFAULT 0`,
];

for (const sql of migrations) {
  try {
    db.exec(sql);
    console.log(`OK: ${sql.substring(0, 60)}...`);
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log(`SKIP (already exists): ${sql.substring(0, 60)}...`);
    } else {
      throw e;
    }
  }
}
```

### Pattern 2: CSV Streaming Import
**What:** Use csv-parse in streaming mode for large files (CCOD is ~3.5M rows)
**When to use:** CCOD import, HMO register import
**Example:**
```javascript
const fs = require('fs');
const { parse } = require('csv-parse');
const { POSTCODES } = require('./lib/config');

const parser = fs.createReadStream(filePath)
  .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }));

for await (const row of parser) {
  // Filter to target postcodes
  const postcode = row['Property Address'] || '';
  const outcode = postcode.match(/([A-Z]{1,2}\d{1,2}[A-Z]?)\s/i);
  if (outcode && POSTCODES.includes(outcode[1].toUpperCase())) {
    // Insert into database
  }
}
```

### Pattern 3: Apify MCP Orchestration (NOT standalone scripts)
**What:** Claude calls Apify MCP tools directly during session, not via Node scripts
**When to use:** OpenRent scraping, Rightmove/Zoopla scraping
**Important:** These are NOT scripts in the scripts/ directory. The planner should create tasks for Claude to run Apify Actors via MCP tools during execution, then process results into the database. The "scripts" are the database insertion logic that processes Apify output.

### Pattern 4: Deduplication with Two Passes
**What:** First pass: exact match (company number, UPRN). Second pass: fuzzy match (name + address)
**When to use:** build-lead-list.js
**Example:**
```javascript
const Fuse = require('fuse.js');

// Pass 1: Exact matches
// Group by company_number (non-null)
// Group by shared UPRN on properties

// Pass 2: Fuzzy name matching within same postcode area
const fuseOptions = {
  keys: ['name'],
  threshold: 0.3,        // 0 = exact, 1 = match anything
  includeScore: true,
  minMatchCharLength: 3,
};

// For each unmatched landlord, search against others in same outcode
const fuse = new Fuse(landlordsByOutcode, fuseOptions);
const results = fuse.search(landlord.name);

// score < 0.2 = auto-merge (HIGH confidence)
// score 0.2-0.4 = flag for review (MEDIUM confidence)
// score > 0.4 = no match
```

### Anti-Patterns to Avoid
- **Loading entire CCOD CSV into memory:** The file is ~500MB+. Use streaming with csv-parse, never `fs.readFileSync` + split.
- **Running Apify scrapes in Node scripts:** The locked decision is Claude MCP orchestration. Scripts should only handle DB insertion of results, not Actor invocation.
- **Deduplicating without source priority:** When merging, Companies House data wins for name/company_number, EPC Register wins for energy ratings. Never overwrite higher-priority data with lower-priority data.
- **Hardcoding HMO register column names:** Council CSVs have different column layouts. Use a column mapping config per council.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom split/regex | csv-parse | Handles quoted fields with commas, newlines in values, BOM, encoding |
| CSV writing | String concatenation | csv-stringify | Proper escaping, quoting, handles special characters |
| Fuzzy string matching | Levenshtein distance function | fuse.js | Battle-tested scoring, configurable thresholds, handles accents/case |
| UK postcode parsing | Regex extraction | postcode package | Validates format, normalises spacing, extracts outcode/incode/area |
| Excel parsing | Manual binary parsing | xlsx package | Already installed, handles .xls and .xlsx, reads sheets to JSON |

**Key insight:** CSV parsing looks trivial but edge cases (quoted fields containing commas, embedded newlines, BOM markers, encoding issues) make hand-rolled parsers fragile. The CCOD file is government-generated with double-quoted fields -- csv-parse handles this correctly out of the box.

## Common Pitfalls

### Pitfall 1: CCOD File Size
**What goes wrong:** Attempting to load the entire CCOD CSV into memory crashes Node.js (file is 500MB+, ~3.5M rows nationally)
**Why it happens:** Default approach of `fs.readFileSync` + `JSON.parse` or `.split('\n')`
**How to avoid:** Use csv-parse streaming mode. Process row by row, filter to target postcodes, insert in batches of 1000.
**Warning signs:** Memory usage climbing past 1GB during import

### Pitfall 2: CCOD Download Requires Account
**What goes wrong:** Script tries to auto-download CCOD but gets 403/redirect to login
**Why it happens:** Land Registry requires a free account to download bulk data from use-land-property-data.service.gov.uk
**How to avoid:** Script should expect the CSV file to already exist locally in `data/` directory. Sam downloads it manually via browser after creating a free account. Script validates file exists before processing.
**Warning signs:** HTTP errors during download attempt

### Pitfall 3: Duplicate Landlord Records from Different Name Formats
**What goes wrong:** "SMITH PROPERTY LTD" and "Smith Property Limited" create two separate landlord records
**Why it happens:** Different sources format company names differently (ALL CAPS vs mixed case, Ltd vs Limited, & vs AND)
**How to avoid:** Normalise names before matching: uppercase, strip "LIMITED"/"LTD"/"LLP" suffixes, replace "&" with "AND", trim whitespace. Then use Fuse.js on normalised names.
**Warning signs:** Landlord count much higher than expected after import

### Pitfall 4: HMO Register Column Variation
**What goes wrong:** Script fails on one council's CSV because columns are named differently
**Why it happens:** No standard format for HMO registers. Stockport might use "Licence Holder" while Manchester uses "Landlord Name"
**How to avoid:** Use a column mapping object per council. Script reads the header row, maps to internal field names, fails gracefully with clear error if expected columns not found.
**Warning signs:** Null/undefined values in database after import

### Pitfall 5: Apify Actor Output Schema Changes
**What goes wrong:** Script that processes Apify output breaks because fields were renamed or restructured
**Why it happens:** Apify Actors are third-party maintained; output schemas can change without notice
**How to avoid:** Validate expected fields exist in Apify output before processing. Log warnings for missing fields. Don't assume nested structure -- check each level.
**Warning signs:** Null values or errors during Apify result processing

### Pitfall 6: SQLite UNIQUE Constraint on Company Number with Nulls
**What goes wrong:** The UNIQUE(company_number) constraint only applies to non-null values in SQLite. Individual landlords (no company number) need a different dedup key.
**Why it happens:** SQLite allows multiple NULL values in UNIQUE columns
**How to avoid:** For individuals, dedup on normalised name + postcode. Company number uniqueness only catches corporate duplicates.
**Warning signs:** Many duplicate individual landlord records

## Code Examples

### CCOD CSV Row Processing
```javascript
// CCOD columns (based on Land Registry tech spec):
// Title Number, Tenure, Property Address, District, County, Region,
// Postcode, Multiple Address Indicator, Price Paid, Proprietor Name (1),
// Company Registration No (1), Proprietorship Category (1),
// Proprietor (1) Address (1), Proprietor (1) Address (2), Proprietor (1) Address (3),
// Date Proprietor Added, Additional Proprietor Indicator
// (Proprietor fields repeat for up to 4 proprietors)

function processCcodRow(row) {
  const address = row['Property Address'] || '';
  const postcode = row['Postcode'] || '';
  const { valid, outcode } = parsePostcode(postcode);

  if (!valid || !POSTCODES.includes(outcode)) return null;

  return {
    titleNumber: row['Title Number'],
    tenure: row['Tenure'],
    address,
    postcode,
    district: row['District'],
    proprietorName: row['Proprietor Name (1)'],
    companyRegNo: row['Company Registration No (1)'],
    proprietorshipCategory: row['Proprietorship Category (1)'],
    proprietorAddress: row['Proprietor (1) Address (1)'],
    dateProprietorAdded: row['Date Proprietor Added'],
  };
}
```

### Fuzzy Name Matching with Fuse.js
```javascript
const Fuse = require('fuse.js');

function normaliseName(name) {
  return name
    .toUpperCase()
    .replace(/\bLIMITED\b/g, 'LTD')
    .replace(/\bAND\b/g, '&')
    .replace(/[^A-Z0-9&\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findFuzzyMatches(landlords, threshold = 0.3) {
  const normalised = landlords.map(l => ({
    ...l,
    normalisedName: normaliseName(l.name),
  }));

  const fuse = new Fuse(normalised, {
    keys: ['normalisedName'],
    threshold,
    includeScore: true,
  });

  const matches = [];
  const processed = new Set();

  for (const landlord of normalised) {
    if (processed.has(landlord.id)) continue;
    const results = fuse.search(landlord.normalisedName);

    for (const result of results) {
      if (result.item.id === landlord.id) continue;
      if (processed.has(result.item.id)) continue;

      matches.push({
        landlordA: landlord.id,
        landlordB: result.item.id,
        score: result.score,
        confidence: result.score < 0.2 ? 'HIGH' : 'MEDIUM',
      });
    }
    processed.add(landlord.id);
  }
  return matches;
}
```

### Snov.io Export Format
```javascript
// Snov.io Bulk Email Search requires: First name, Last name, Company domain
// Snov.io Prospect Import accepts: Full Name, First Name, Last Name, Email,
//   Location, Industry, Country, Social URL, Position, Company Name,
//   Company Website, HQ Phone
// Source: https://snov.io/knowledgebase/how-to-import-a-prospect-list-into-your-snovio-account/

function buildSnovIoRow(landlord) {
  const [firstName, ...lastParts] = (landlord.name || '').split(' ');
  return {
    'First Name': firstName || '',
    'Last Name': lastParts.join(' ') || '',
    'Company Name': landlord.entity_type !== 'individual' ? landlord.name : '',
    'Location': 'Greater Manchester, UK',
    'Country': 'United Kingdom',
    'Position': 'Director',  // Most SPV landlords are directors
  };
}
```

### Address Normalisation
```javascript
const { parse: parsePostcode } = require('postcode');

function normaliseAddress(address) {
  return address
    .toUpperCase()
    .replace(/\bSTREET\b/g, 'ST')
    .replace(/\bROAD\b/g, 'RD')
    .replace(/\bAVENUE\b/g, 'AVE')
    .replace(/\bDRIVE\b/g, 'DR')
    .replace(/\bLANE\b/g, 'LN')
    .replace(/\bCRESCENT\b/g, 'CRES')
    .replace(/\bCLOSE\b/g, 'CL')
    .replace(/\bCOURT\b/g, 'CT')
    .replace(/,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPostcodeOutcode(postcodeStr) {
  const result = parsePostcode(postcodeStr);
  if (!result.valid) return null;
  return result.outcode; // e.g. "SK1", "M14"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CCOD was paid data | CCOD free since Nov 2017 | 2017 | No cost barrier; requires free account |
| Manual HMO register requests | FOI requests + online registers | Ongoing | Stockport/Manchester data quality varies |
| Complex NLP for entity matching | Fuse.js fuzzy search + normalisation | Stable | Good enough for 10K-100K records; no ML needed |
| Paid address normalisation APIs | Simple regex + postcode package | Stable | Sufficient for UK-only addresses in known areas |

**Deprecated/outdated:**
- CCOD was previously known as "Commercial and Corporate Ownership Data" -- now officially called "UK companies that own property in England and Wales"
- Some tutorials reference CCOD API access -- there is no API for bulk download; it is CSV only from the portal

## Open Questions

1. **Exact CCOD CSV column headers**
   - What we know: Columns include Title Number, Tenure, Property Address, Proprietor Name, Company Registration No, and address fields. Up to 4 proprietors per row.
   - What's unclear: Exact header strings (e.g. "Proprietor Name (1)" vs "Proprietor_Name_1"). The tech spec page returns 403.
   - Recommendation: When Sam downloads the CCOD file, read the first line to confirm exact header names before building the parser. The script should log headers on first run.

2. **OpenRent scraper output schema**
   - What we know: Apify Actors return JSON with property details, landlord info, rent, availability
   - What's unclear: Exact field names vary by Actor; whether "self-managing" is a specific field or inferred from listing type
   - Recommendation: Use `fetch-actor-details` via Apify MCP to get exact input/output schema before building processing logic. On OpenRent, properties listed directly (not via agent) indicate self-managing landlords.

3. **HMO register file formats from Stockport and Manchester**
   - What we know: Sam has local CSV files
   - What's unclear: Exact column names, whether licence holder name matches landlord or managing agent
   - Recommendation: Read actual files during implementation, build flexible column mapper

4. **Fuse.js threshold tuning**
   - What we know: threshold 0.3 is a reasonable starting point; lower = stricter
   - What's unclear: Optimal threshold for landlord name matching (may need tuning after first run)
   - Recommendation: Start with 0.3, auto-merge at score < 0.2, flag 0.2-0.4 for review, reject > 0.4. Output review CSV so Sam can validate and adjust.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None -- uses `node --test` |
| Quick run command | `node --test scripts/tests/test-*.js` |
| Full suite command | `node --test scripts/tests/test-*.js` |

### Phase Requirements -> Test Map
| Req ID | Behaviour | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | CCOD CSV parsing filters target postcodes and imports to DB | unit | `node --test scripts/tests/test-ccod.js -x` | No -- Wave 0 |
| DATA-02 | OpenRent Apify results processed into DB | unit | `node --test scripts/tests/test-openrent.js -x` | No -- Wave 0 |
| DATA-03 | HMO register CSV/XLSX parsed with flexible column mapping | unit | `node --test scripts/tests/test-hmo.js -x` | No -- Wave 0 |
| DATA-04 | Rightmove/Zoopla Apify results processed into DB | unit | `node --test scripts/tests/test-rightmove.js -x` | No -- Wave 0 |
| INTEL-01 | Dedup merges exact matches, flags fuzzy matches, respects source priority | unit | `node --test scripts/tests/test-dedup.js -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test scripts/tests/test-*.js`
- **Per wave merge:** `node --test scripts/tests/test-*.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/tests/test-ccod.js` -- covers DATA-01 (CCOD parsing + postcode filtering)
- [ ] `scripts/tests/test-hmo.js` -- covers DATA-03 (HMO register parsing)
- [ ] `scripts/tests/test-dedup.js` -- covers INTEL-01 (deduplication logic)
- [ ] `scripts/tests/test-openrent.js` -- covers DATA-02 (OpenRent result processing)
- [ ] `scripts/tests/test-rightmove.js` -- covers DATA-04 (Rightmove result processing)

## Sources

### Primary (HIGH confidence)
- [Land Registry CCOD dataset page](https://use-land-property-data.service.gov.uk/datasets/ccod) -- download portal, format description
- [GOV.UK CCOD guidance](https://www.gov.uk/guidance/hm-land-registry-uk-companies-that-own-property-in-england-and-wales) -- dataset scope and purpose
- [Snov.io import guide](https://snov.io/knowledgebase/how-to-import-a-prospect-list-into-your-snovio-account/) -- CSV column requirements verified via WebFetch
- npm registry -- version numbers verified via `npm view` on 2026-03-28

### Secondary (MEDIUM confidence)
- [Fuse.js official site](https://www.fusejs.io/) -- API docs and configuration options
- [Apify OpenRent scraper](https://apify.com/vivid-softwares/openrent-scraper) -- Actor features and output description
- [Apify Rightmove scraper](https://apify.com/dhrumil/rightmove-scraper) -- Actor features and capabilities
- [postcode npm package](https://www.npmjs.com/package/postcode) -- UK postcode parsing

### Tertiary (LOW confidence)
- CCOD exact column header names -- inferred from multiple sources but tech spec page returned 403; needs validation against actual downloaded file
- OpenRent output field names -- general descriptions only; exact schema needs `fetch-actor-details` via Apify MCP

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified via npm, existing project patterns clear
- Architecture: HIGH -- follows established Phase 1 patterns, straightforward extension
- Data source formats: MEDIUM -- CCOD column names need validation against actual file; HMO registers are council-specific
- Deduplication logic: MEDIUM -- Fuse.js approach is sound but threshold tuning needs real data
- Pitfalls: HIGH -- common issues well-documented in ecosystem

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable domain; CCOD format rarely changes; npm packages stable)
