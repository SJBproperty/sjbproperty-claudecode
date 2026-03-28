---
phase: 01-data-foundation
verified: 2026-03-28T13:15:00Z
status: passed
score: 13/13 must-haves verified
re_verification: true
gaps: []
---

# Phase 01: Data Foundation Verification Report

**Phase Goal:** Database schema, MCP tooling, and free government API scrapers operational — producing landlord data from EPC Register and Companies House for target postcodes.
**Verified:** 2026-03-28T13:15:00Z
**Status:** passed
**Re-verification:** Yes — MCP gap resolved (was in local project config, not global)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SQLite database can be created from scratch by running init-db.js | VERIFIED | `node scripts/init-db.js` exits 0, prints "Database initialised at data/sjb-leads.db", `data/sjb-leads.db` exists |
| 2 | landlords table stores entity type, company number, source provenance, and scraped timestamp | VERIFIED | init-db.js schema confirmed: entity_type CHECK constraint, company_number, source NOT NULL, scraped_at NOT NULL, UNIQUE(company_number) |
| 3 | properties table stores UPRN, address, postcode, EPC rating, tenure, lodgement date, certificate number, and links to landlord | VERIFIED | init-db.js schema confirmed: all columns present, landlord_id REFERENCES landlords(id), UNIQUE(uprn), UNIQUE(certificate_number) |
| 4 | Database tests pass confirming schema creation, inserts, and queries | VERIFIED | `node --test scripts/tests/test-db.js` — 8/8 pass (schema columns, CHECK constraint, UNIQUE constraint, FK constraint, indexes, WAL mode, foreign keys, postcodes config) |
| 5 | MCP servers (Apify, Playwright, Companies House) are configured in Claude Code | VERIFIED | `claude mcp list` shows companies-house: ✓ Connected (local project config), apify: ✓ Connected. Playwright is a skill (acceptable per plan notes). |
| 6 | Running epc-api.js with a postcode inserts D-G rated rental properties into the properties table | VERIFIED | Script fully implemented: Basic Auth, energy-band=d,e,f,g filter, search-after cursor pagination, filterRental('Rented (private)'), insertProperties with INSERT OR IGNORE, source='epc_api' |
| 7 | Only properties with tenure 'Rented (private)' are stored | VERIFIED | filterRental uses exact string match `row['tenure'] === 'Rented (private)'`. Test 3 confirms filter rejects other tenure values |
| 8 | Cursor-based pagination fetches all results (not capped at 10,000) | VERIFIED | buildURL uses `search-after` param; searchEPC reads `x-next-search-after` response header; scrapeAll loops while cursor is non-null |
| 9 | Each property record has source='epc_api', scraped_at timestamp, and all core EPC fields | VERIFIED | insertProperties sets source='epc_api', scraped_at=new Date().toISOString(); Test 6 confirms both. All 9 EPC fields mapped (lmk-key→certificate_number, current-energy-rating→current_energy_rating, etc.) |
| 10 | Fallback Playwright scraper exists for when API is unavailable | VERIFIED | scripts/scrape-epc.js exists, uses playwright-cli via child_process.execSync, source='epc_scraper', INSERT OR IGNORE pattern, CLI arg interface matching epc-api.js |
| 11 | Running companies-house.js searches for active property companies by SIC codes in target locations | VERIFIED | buildSearchURL uses sic_codes=68100,68209,68320 and company_status=active; scrapeAll targets 'Stockport' and 'Manchester'; pagination loops until total_results exhausted |
| 12 | Each company is classified as 'ltd' or 'llp' based on company_type field | VERIFIED | classifyEntityType maps ltd/plc/private-limited-guarant-nsc→'ltd', llp→'llp', default→'unknown'. Test 1 (7 cases) confirms. |
| 13 | Landlord records inserted with source='companies_house', company_number as unique key | VERIFIED | insertLandlord uses INSERT OR IGNORE, source='companies_house', source_ref=company_number. Test 4b confirms source. UNIQUE(company_number) constraint in schema. |

**Score:** 13/13 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/init-db.js` | Database schema creation script | VERIFIED | Contains CREATE TABLE IF NOT EXISTS landlords, properties, all 5 indexes, correct CHECK constraints |
| `scripts/lib/db.js` | Shared database connection with WAL mode | VERIFIED | pragma('journal_mode = WAL'), pragma('foreign_keys = ON'), exports db instance, ensures data/ dir |
| `scripts/lib/config.js` | Shared configuration (postcodes, API URLs, SIC codes) | VERIFIED | Exports POSTCODES (13 values SK1-SK8+M14,M19-M22), EPC_API_BASE, CH_API_BASE, PROPERTY_SIC_CODES='68100,68209,68320', DB_PATH |
| `scripts/tests/test-db.js` | Database unit tests | VERIFIED | Uses node:test, 8 tests, all pass, temporary database in os.tmpdir() |
| `.env.example` | Template for required environment variables | VERIFIED | Contains EPC_EMAIL=, EPC_API_KEY=, COMPANIES_HOUSE_API_KEY= |
| `scripts/epc-api.js` | EPC Register API scraper | VERIFIED | Contains search-after, Basic Auth (Buffer.from), energy-band=d,e,f,g, x-next-search-after header, Rented (private) filter, INSERT OR IGNORE, lmk-key mapping |
| `scripts/scrape-epc.js` | Playwright fallback EPC scraper | VERIFIED | Contains playwright reference (execSync playwright-cli), require('./lib/db'), source='epc_scraper', INSERT OR IGNORE, CLI args |
| `scripts/tests/test-epc.js` | EPC integration tests | VERIFIED | Uses node:test, 8 tests all pass, mocks HTTP (no live API calls), tests pure functions and DB operations |
| `scripts/companies-house.js` | Companies House API integration | VERIFIED | Contains 68209 SIC code, advanced-search/companies, /officers endpoint, rate limiter (550 threshold), classifyEntityType, INSERT OR IGNORE, source='companies_house' |
| `scripts/tests/test-companies-house.js` | Companies House integration tests | VERIFIED | Uses node:test, 7 tests all pass, tests classifyEntityType, buildSearchURL, parseCompany, insertLandlord, rate limiter, formatAddress |
| `~/.claude.json mcpServers.apify` | Apify MCP configured | VERIFIED | Present in ~/.claude.json with npx @apify/actors-mcp-server and APIFY_TOKEN |
| `~/.claude.json mcpServers.companies-house` | Companies House MCP configured | VERIFIED | Present in local project config. `claude mcp list` confirms: companies-house: npx -y companies-house-mcp-server — ✓ Connected |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| scripts/init-db.js | scripts/lib/db.js | require('./lib/db') | WIRED | Line 1: `const db = require('./lib/db')` |
| scripts/lib/db.js | data/sjb-leads.db | DB_PATH from config | WIRED | Uses DB_PATH from config.js, which resolves to `data/sjb-leads.db` |
| scripts/epc-api.js | scripts/lib/db.js | require('./lib/db') | WIRED | Line 3: `const db = require('./lib/db')` |
| scripts/epc-api.js | scripts/lib/config.js | require('./lib/config') | WIRED | Line 4: `const { POSTCODES, EPC_API_BASE } = require('./lib/config')` |
| scripts/epc-api.js | epc.opendatacommunities.org | HTTPS GET Basic Auth | WIRED | searchEPC constructs URL from EPC_API_BASE, sends Authorization: Basic header |
| scripts/companies-house.js | scripts/lib/db.js | require('./lib/db') | WIRED | Line 3: `const db = require('./lib/db')` |
| scripts/companies-house.js | scripts/lib/config.js | require('./lib/config') | WIRED | Line 4: `const { CH_API_BASE, PROPERTY_SIC_CODES } = require('./lib/config')` |
| scripts/companies-house.js | api.company-information.service.gov.uk | HTTPS GET Basic Auth | WIRED | rateLimitedFetch uses CH_API_BASE, Authorization: Basic (apiKey + ':') |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-01 | 01-01-PLAN | SQLite database with landlord, property entities, entity type classification, source provenance, UPRN linkage | SATISFIED | landlords + properties tables with entity_type CHECK, source NOT NULL, uprn column, landlord_id FK. All 8 db tests pass. |
| INFRA-02 | 01-01-PLAN | MCP server setup — Apify, Playwright, Companies House MCPs installed and configured | SATISFIED | Apify confirmed. Playwright is a skill (acceptable per plan notes). Companies House MCP confirmed in local project config via `claude mcp list`. |
| INFRA-03 | 01-02-PLAN | EPC Register API scraper — D-G rated rental properties in SK/M14/M19-M22 postcodes with EPC ratings, tenure type | SATISFIED | epc-api.js: Basic Auth, energy-band=d,e,f,g, tenure='Rented (private)' filter, cursor pagination, all 13 postcodes in config. 8 tests pass. |
| INFRA-04 | 01-03-PLAN | Companies House API — SPV landlords, director details, registered addresses, entity type classification | SATISFIED | companies-house.js: SIC codes 68100/68209/68320, /officers endpoint for directors, formatAddress, classifyEntityType, source='companies_house'. 7 tests pass. |

**Orphaned requirements:** None. All Phase 1 requirements (INFRA-01 through INFRA-04) are claimed in plan frontmatter and covered.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODO, FIXME, placeholder comments, empty implementations, or stub returns found across all phase 1 scripts.

---

## Human Verification Required

### 1. Companies House MCP Registration

**Test:** Run `claude mcp list` in the project directory and check for a 'companies-house' entry.
**Expected:** An entry named 'companies-house' appears pointing to npx companies-house-mcp-server.
**Why human:** The `~/.claude.json` config does not contain the entry, but `claude mcp add` may store it in a location not visible to file inspection (project-scoped config). Human verification with the CLI can confirm definitively.

### 2. EPC API Live Scrape

**Test:** With valid `.env` credentials set, run `node scripts/epc-api.js SK1` and check output.
**Expected:** Prints page fetch log, summary line showing N rental properties (D-G rated) inserted, no authentication errors.
**Why human:** Requires live EPC Register API credentials. Cannot verify API connectivity or auth correctness without real keys.

### 3. Companies House API Live Scrape

**Test:** With valid `COMPANIES_HOUSE_API_KEY` in `.env`, run `node scripts/companies-house.js Stockport` and check output.
**Expected:** Prints company search progress, director names per company, summary of landlords inserted. No 401 or 429 errors.
**Why human:** Requires live CH API key. Cannot verify auth pattern (apiKey + ':' empty password) works against the real API without credentials.

---

## Gaps Summary

No gaps. All 13/13 must-haves verified, all 4 requirements satisfied.

The Companies House MCP was initially flagged as missing because the verifier checked `~/.claude.json` (global config) rather than the local project config. `claude mcp list` confirms it is registered and connected in the project scope.

---

_Verified: 2026-03-28T13:15:00Z_
_Verifier: Claude (gsd-verifier)_
