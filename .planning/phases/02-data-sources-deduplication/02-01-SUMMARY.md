---
phase: 02-data-sources-deduplication
plan: 01
subsystem: database
tags: [csv-parse, postcode, fuse.js, sqlite, ccod, land-registry, normalisation]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: SQLite database with landlords + properties tables, db.js, config.js
provides:
  - Phase 2 schema migration (10 new columns for HMO, CCOD, listings, dedup)
  - Address and name normalisation utilities (normalise.js)
  - Postcode outcode extraction using postcode library
  - CCOD CSV streaming importer with postcode filtering
  - Config constants for CCOD_PATH, EXPORTS_DIR, HMO_DIR
affects: [02-02, 02-03, 02-04, 03-lead-scoring]

# Tech tracking
tech-stack:
  added: [fuse.js, csv-parse, csv-stringify, postcode]
  patterns: [streaming CSV import, transaction batching, idempotent migrations, name/address normalisation]

key-files:
  created:
    - scripts/lib/normalise.js
    - scripts/migrate-phase2.js
    - scripts/import-ccod.js
    - scripts/tests/test-normalise.js
    - scripts/tests/test-ccod.js
  modified:
    - scripts/lib/config.js
    - package.json

key-decisions:
  - "Idempotent migration using try/catch on duplicate column name errors"
  - "CCOD importer exports importCcod function for testability with injected DB"
  - "Transaction batching every 1000 rows for streaming performance"

patterns-established:
  - "Idempotent migrations: wrap ALTER TABLE in try/catch for duplicate column detection"
  - "Normalisation before storage: always normalise names/addresses before DB insert"
  - "Testable importers: export async function accepting (filePath, db) for unit testing with temp DBs"

requirements-completed: [DATA-01]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 02 Plan 01: CCOD Foundation Summary

**Phase 2 schema migration with 10 new columns, address/name normalisation library, and Land Registry CCOD streaming CSV importer filtering to SK1-SK8/M14/M19-M22 postcodes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T15:34:28Z
- **Completed:** 2026-03-28T15:37:50Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Schema migration adding 10 new columns (HMO licence, CCOD title numbers, listing URL, void days, match grouping) — idempotent
- Normalisation library with address abbreviation, name standardisation, and postcode outcode extraction
- CCOD CSV streaming importer that handles ~500MB files, filters to target postcodes, upserts landlords by company number, and accumulates title numbers
- 18 passing tests across normalisation and CCOD import

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration, shared libraries, and dependency installation** - `70685ad` (feat)
2. **Task 2: Land Registry CCOD CSV streaming importer** - `797f838` (feat)

## Files Created/Modified
- `scripts/lib/normalise.js` - Address, name, and postcode normalisation utilities
- `scripts/migrate-phase2.js` - Idempotent schema migration adding 10 Phase 2 columns
- `scripts/import-ccod.js` - Streaming CCOD CSV importer with postcode filtering and landlord upsert
- `scripts/lib/config.js` - Added CCOD_PATH, EXPORTS_DIR, HMO_DIR constants
- `package.json` - Added fuse.js, csv-parse, csv-stringify, postcode dependencies
- `scripts/tests/test-normalise.js` - 11 tests for normalisation and migration
- `scripts/tests/test-ccod.js` - 7 tests for CCOD import filtering, upsert, and counting

## Decisions Made
- Idempotent migration using try/catch on "duplicate column name" errors rather than checking PRAGMA table_info first — simpler and equally safe
- CCOD importer exports an `importCcod(filePath, db)` function for testability with injected temp databases
- Transaction batching every 1000 rows balances memory usage and write performance for large CSVs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

To use the CCOD importer, Sam must:
1. Create a free account at https://use-land-property-data.service.gov.uk/datasets/ccod
2. Download CCOD_FULL.csv and place it at `data/CCOD_FULL.csv`
3. Run `node scripts/import-ccod.js`

## Next Phase Readiness
- Schema ready for all Phase 2 data sources (HMO registers, Rightmove listings, deduplication)
- Normalisation utilities available for all subsequent importers
- CCOD import can run as soon as Sam downloads the CSV file

## Self-Check: PASSED

- All 7 created/modified files verified present on disk
- Commit `70685ad` verified in git log
- Commit `797f838` verified in git log
- 18/18 tests passing

---
*Phase: 02-data-sources-deduplication*
*Completed: 2026-03-28*
