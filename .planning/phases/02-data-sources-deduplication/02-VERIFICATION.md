---
phase: 02-data-sources-deduplication
verified: 2026-03-28T16:30:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Run node scripts/import-ccod.js after downloading CCOD_FULL.csv from Land Registry"
    expected: "Script streams file, filters to SK1-SK8/M14/M19-M22, logs progress and summary counts"
    why_human: "CCOD_FULL.csv (~500MB) requires a free Land Registry account to download — cannot verify without the actual file"
  - test: "Run node scripts/parse-hmo.js with a real Stockport or Manchester HMO register download"
    expected: "Flexible column mapping resolves correctly, licence numbers stored, summary logged"
    why_human: "HMO register files require FOI request or direct council download — not available in repo"
  - test: "Run node scripts/process-openrent.js and node scripts/process-rightmove.js with real Apify Actor output"
    expected: "Properties imported with void_days and listing_quality_score; postcode filter applied"
    why_human: "Requires running Apify Actors via MCP to generate JSON output files first"
---

# Phase 2: Data Sources and Deduplication — Verification Report

**Phase Goal:** All 5 data sources captured and landlord records deduplicated into unified profiles with source provenance.
**Verified:** 2026-03-28T16:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | CCOD CSV rows for target postcodes are imported into the database with proprietor name, company registration number, title number, and address | VERIFIED | `scripts/import-ccod.js` streams with csv-parse, filters via `POSTCODES.includes(outcode)`, upserts landlords by company number, inserts properties with title_number. 7/7 tests pass. |
| 2 | Schema has new columns for Phase 2 data sources (hmo_licence_number, void_days, listing_url, title_number, match_group_id, etc.) | VERIFIED | `scripts/migrate-phase2.js` runs 10 idempotent `ALTER TABLE` statements. Migration idempotency test passes. |
| 3 | Address normalisation and postcode parsing utilities are available for all Phase 2 scripts | VERIFIED | `scripts/lib/normalise.js` exports `normaliseAddress`, `normaliseName`, `extractPostcodeOutcode`. 11/11 tests pass. |
| 4 | HMO register CSV/XLSX files are parsed with flexible column mapping and imported into the database | VERIFIED | `scripts/parse-hmo.js` defines `COLUMN_MAPS` with stockport, manchester, _default. Handles CSV and XLSX. 8/8 tests pass. |
| 5 | OpenRent Apify Actor output is processed into landlords and properties tables with self-managing flag, void period data, and listing URLs | VERIFIED | `scripts/process-openrent.js` processes JSON, calculates `void_days`, sets `entity_type='individual'`, `source='openrent'`, stores self-managing in source_ref. 6/6 tests pass. |
| 6 | Rightmove/Zoopla Apify Actor output is processed into properties table with void period analysis and listing quality scoring | VERIFIED | `scripts/process-rightmove.js` calculates `listing_quality_score` (0-100) across photos/description/floorplan/EPC, calculates void_days, `source='rightmove'`. 6/6 tests pass. |
| 7 | Landlord records from all 5+ sources are deduplicated into unified profiles using exact match (company number, UPRN) and fuzzy name matching | VERIFIED | `scripts/lib/dedup.js` implements `findExactMatches` (company_number + UPRN passes) and `findFuzzyMatches` (Fuse.js, scoped by postcode outcode). 11/11 tests pass. |
| 8 | High-confidence matches are auto-merged with source priority; uncertain matches flagged for review | VERIFIED | `mergeRecords` applies source priority: companies-house (1) > epc (2) > ccod (3) > hmo-register (4) > openrent (5) > rightmove (6). autoMerge threshold <0.2, review 0.2-0.4. |
| 9 | Four date-stamped CSV exports are produced: all-leads, high-priority-leads, hmo-landlords, snov-io-import (plus review-matches) | VERIFIED | `scripts/build-lead-list.js` produces 5 CSVs. Integration test (7/7 passing) confirms all-leads deduplication, high-priority EPC D-G filter, HMO inclusion, Snov.io format with "Greater Manchester", date-stamped filenames. |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/migrate-phase2.js` | Schema migration adding Phase 2 columns | VERIFIED | 10 ALTER TABLE statements, idempotent via try/catch on "duplicate column name", exports `runMigration` |
| `scripts/lib/normalise.js` | Address/name normalisation helpers | VERIFIED | Exports `normaliseAddress`, `normaliseName`, `extractPostcodeOutcode`. Uses `postcode` library. |
| `scripts/import-ccod.js` | CCOD CSV streaming importer | VERIFIED | Uses `fs.createReadStream` + `csv-parse` in streaming mode. Never loads full file. Exports `importCcod(filePath, db)` for testability. |
| `scripts/tests/test-ccod.js` | Unit tests for CCOD parsing | VERIFIED | 7 tests covering postcode filtering, upsert, title number accumulation, name normalisation, counts. |
| `scripts/parse-hmo.js` | HMO register CSV/XLSX parser | VERIFIED | COLUMN_MAPS with 3 council mappings, resolves mapping against actual headers, uses csv-parse/sync and xlsx. |
| `scripts/process-openrent.js` | OpenRent Apify result processor | VERIFIED | Processes JSON array, calculates void_days, stores listing_url, detects self-managing, source='openrent'. |
| `scripts/process-rightmove.js` | Rightmove/Zoopla Apify result processor | VERIFIED | listing_quality_score 0-100, void_days from listing date, source='rightmove', no landlord records created. |
| `scripts/tests/test-hmo.js` | Unit tests for HMO register parsing | VERIFIED | 8 tests covering both CSV variants, XLSX, postcode filtering, source_ref, licence storage, error handling. |
| `scripts/tests/test-openrent.js` | Unit tests for OpenRent processing | VERIFIED | 6 tests covering landlords, void_days, self-managing detection, postcode filtering, missing fields. |
| `scripts/tests/test-rightmove.js` | Unit tests for Rightmove processing | VERIFIED | 6 tests covering quality scoring, void_days, postcode filtering, missing fields. |
| `scripts/lib/dedup.js` | Deduplication engine | VERIFIED | Exports `findExactMatches`, `findFuzzyMatches`, `mergeRecords`. Uses Fuse.js and normalise.js. Source priority table defined. |
| `scripts/build-lead-list.js` | Master dedup + 5 CSV exports | VERIFIED | Orchestrates exact + fuzzy dedup, produces 5 CSVs, exports `buildLeadList(db, exportsDir)` for testability, guarded with `require.main`. |
| `scripts/tests/test-dedup.js` | Unit tests for deduplication logic | VERIFIED | 11 tests covering exact match (company_number, UPRN, null handling), fuzzy match (auto-merge, no-match, cross-area isolation), merging (primary selection, group assignment, confidence, source priority). |
| `scripts/tests/test-build-lead-list.js` | Integration tests for build-lead-list | VERIFIED | 7 tests with seeded temp DB — dedup row reduction, EPC D-G filter, HMO inclusion, Snov.io format, review-matches CSV, date-stamped filenames. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/import-ccod.js` | `scripts/lib/db.js` | `require('./lib/db')` | WIRED | Used in CLI entry point; injected in tests |
| `scripts/import-ccod.js` | `scripts/lib/normalise.js` | `require('./lib/normalise')` | WIRED | `normaliseName`, `extractPostcodeOutcode` called in processRow |
| `scripts/parse-hmo.js` | `scripts/lib/db.js` | `require('./lib/db')` | WIRED | Used in CLI entry point; injected in tests |
| `scripts/parse-hmo.js` | `scripts/lib/normalise.js` | `require('./lib/normalise')` | WIRED | `normaliseAddress`, `normaliseName`, `extractPostcodeOutcode` called in parseHmo |
| `scripts/process-openrent.js` | `scripts/lib/db.js` | `require('./lib/db')` | WIRED | Used in CLI entry point; injected in tests |
| `scripts/process-rightmove.js` | `scripts/lib/db.js` | `require('./lib/db')` | WIRED | Used in CLI entry point; injected in tests |
| `scripts/lib/dedup.js` | `scripts/lib/normalise.js` | `require('./normalise')` | WIRED | `normaliseName`, `extractPostcodeOutcode` used in `findFuzzyMatches` |
| `scripts/lib/dedup.js` | `fuse.js` | `require('fuse.js')` | WIRED | `new Fuse(landlordsInArea, ...)` called in `findFuzzyMatches` |
| `scripts/build-lead-list.js` | `scripts/lib/dedup.js` | `require('./lib/dedup')` | WIRED | `findExactMatches`, `findFuzzyMatches`, `mergeRecords` all called in `buildLeadList` |
| `scripts/build-lead-list.js` | `csv-stringify` | `require('csv-stringify/sync')` | WIRED | `stringify()` called for all 5 CSV exports |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DATA-01 | 02-01-PLAN.md | Land Registry CCOD bulk download — extract corporate-owned property titles in target postcodes | SATISFIED | `scripts/import-ccod.js` streams CCOD CSV, filters to target postcodes, upserts landlords by company number, stores title_number. 7/7 tests pass. |
| DATA-02 | 02-02-PLAN.md | OpenRent scraper — self-managing landlords with void periods and listing quality | SATISFIED | `scripts/process-openrent.js` processes Apify JSON output, calculates void_days, detects self-managing, stores listing_url. 6/6 tests pass. |
| DATA-03 | 02-02-PLAN.md | Council HMO licensing registers — import existing dated register | SATISFIED | `scripts/parse-hmo.js` parses CSV/XLSX with per-council column mapping, stores hmo_licence_number on landlord and property records. 8/8 tests pass. |
| DATA-04 | 02-02-PLAN.md | Rightmove/Zoopla scraper — void period analysis and listing quality scoring | SATISFIED | `scripts/process-rightmove.js` processes Apify JSON output, calculates listing_quality_score (0-100) and void_days. 6/6 tests pass. |
| INTEL-01 | 02-03-PLAN.md | Cross-source deduplication — match landlord records across all 5+ data sources | SATISFIED | `scripts/lib/dedup.js` two-pass deduplication (exact: company_number + UPRN; fuzzy: Fuse.js within postcode outcode). `scripts/build-lead-list.js` orchestrates and exports 5 CSVs. 11+7=18 tests pass. |

**No orphaned requirements.** REQUIREMENTS.md traceability table maps DATA-01, DATA-02, DATA-03, DATA-04, INTEL-01 to Phase 2 — all five are covered by the three plans above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/lib/normalise.js` | 59, 64 | `return null` | Info | Legitimate — `extractPostcodeOutcode` returns null for invalid postcodes by design. Not a stub. |

No blockers or warnings found. All scripts have substantive implementations. No TODOs, placeholders, or console.log-only handlers detected.

### Human Verification Required

#### 1. CCOD Full Dataset Import

**Test:** Download `CCOD_FULL.csv` from https://use-land-property-data.service.gov.uk/datasets/ccod (free account required), place at `data/CCOD_FULL.csv`, then run `node scripts/import-ccod.js`.
**Expected:** Script streams without loading entire file into memory, logs progress every 100,000 rows, filters to SK1-SK8/M14/M19-M22 postcodes, logs final summary with imported/skipped counts.
**Why human:** The ~500MB CSV requires a Land Registry account to download. Cannot verify real-world streaming behaviour without the file.

#### 2. HMO Register Real File

**Test:** Obtain a real Stockport or Manchester HMO register file (CSV or XLSX) via FOI or council website, then run `node scripts/parse-hmo.js <file> stockport`.
**Expected:** Column mapping resolves against actual council headers, licence numbers stored on both landlord and property records, rows outside target postcodes skipped.
**Why human:** HMO register files are not included in the repo and require external sourcing.

#### 3. OpenRent and Rightmove End-to-End

**Test:** Use Apify MCP to run OpenRent and Rightmove/Zoopla Actors for target postcodes, save output JSON, then run `node scripts/process-openrent.js <output.json>` and `node scripts/process-rightmove.js <output.json>`.
**Expected:** Properties imported with correct void_days, listing_quality_score, and postcode filtering. Summary counts logged.
**Why human:** Requires Apify Actor execution via MCP orchestration to produce real JSON output.

### Test Suite Summary

All automated tests pass with zero failures:

| Test File | Tests | Pass | Fail |
|-----------|-------|------|------|
| test-normalise.js | 11 | 11 | 0 |
| test-ccod.js | 7 | 7 | 0 |
| test-hmo.js | 8 | 8 | 0 |
| test-openrent.js | 6 | 6 | 0 |
| test-rightmove.js | 6 | 6 | 0 |
| test-dedup.js | 11 | 11 | 0 |
| test-build-lead-list.js | 7 | 7 | 0 |
| **Total** | **56** | **56** | **0** |

### Commits Verified

| Commit | Description |
|--------|-------------|
| `70685ad` | feat(02-01): add Phase 2 schema migration, normalisation utilities, and dependencies |
| `797f838` | feat(02-01): add CCOD CSV streaming importer with postcode filtering |
| `20be1cb` | feat(02-02): HMO register CSV/XLSX parser with flexible column mapping |
| `2a22591` | feat(02-02): OpenRent and Rightmove/Zoopla Apify result processors |
| `5dc9205` | feat(02-03): add deduplication engine with exact and fuzzy matching |
| `1f53179` | feat(02-03): add build-lead-list pipeline with 5 CSV exports |

### Gaps Summary

No gaps. All 9 observable truths are verified, all 14 artifacts are substantive and wired, all 10 key links are confirmed present, all 5 requirements (DATA-01 through DATA-04 and INTEL-01) are satisfied, and the full test suite of 56 tests passes with zero failures.

The phase goal — "All 5 data sources captured and landlord records deduplicated into unified profiles with source provenance" — is achieved. Three items require human verification with real external data files, but these are operational prerequisites (downloading CCOD, obtaining HMO registers, running Apify Actors) rather than code gaps.

---
_Verified: 2026-03-28T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
