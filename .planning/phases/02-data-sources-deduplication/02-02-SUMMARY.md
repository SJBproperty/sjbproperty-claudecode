---
phase: 02-data-sources-deduplication
plan: 02
subsystem: database
tags: [csv-parse, xlsx, apify, hmo, openrent, rightmove, sqlite]

# Dependency graph
requires:
  - phase: 02-data-sources-deduplication/01
    provides: "Schema migration (Phase 2 columns), db.js, config.js, normalise.js"
provides:
  - "HMO register CSV/XLSX parser with per-council column mapping"
  - "OpenRent Apify result processor with void_days and self-managing detection"
  - "Rightmove/Zoopla Apify result processor with listing_quality_score (0-100)"
affects: [03-lead-scoring, 02-deduplication]

# Tech tracking
tech-stack:
  added: [csv-parse/sync, xlsx]
  patterns: [flexible-column-mapping, apify-result-processing, listing-quality-scoring]

key-files:
  created:
    - scripts/parse-hmo.js
    - scripts/process-openrent.js
    - scripts/process-rightmove.js
    - scripts/tests/test-hmo.js
    - scripts/tests/test-openrent.js
    - scripts/tests/test-rightmove.js
  modified: []

key-decisions:
  - "Synchronous parseHmo function (not async) since csv-parse/sync and xlsx are both sync"
  - "Listing quality score 0-100 with weighted breakdown: photos (40), description (30), floorplan (15), EPC (15)"
  - "OpenRent source_ref stores self-managing vs agent-managed status"
  - "Rightmove creates no landlord records (listings show agents, not landlords)"

patterns-established:
  - "Apify result processor pattern: read JSON, extract fields with fallback alternatives, filter postcodes, insert to DB"
  - "Flexible column mapping: per-council mappings with _default fallback"

requirements-completed: [DATA-02, DATA-03, DATA-04]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 02 Plan 02: Data Source Processors Summary

**HMO register CSV/XLSX parser with per-council column mapping, OpenRent processor with void_days and self-managing detection, Rightmove processor with listing_quality_score (0-100)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T15:41:09Z
- **Completed:** 2026-03-28T15:45:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- HMO register parser handles CSV and XLSX with flexible per-council column mapping (Stockport, Manchester, _default fallback)
- OpenRent Apify result processor creates landlord (entity_type=individual) and property records with void_days calculation and self-managing landlord detection
- Rightmove/Zoopla Apify result processor creates property records with listing_quality_score (0-100) based on photos, description, floorplan, and EPC presence
- All three scripts filter to target postcodes (SK1-SK8, M14, M19-M22) and use shared db.js, config.js, normalise.js

## Task Commits

Each task was committed atomically:

1. **Task 1: HMO register CSV/XLSX parser** - `20be1cb` (feat)
2. **Task 2: OpenRent and Rightmove/Zoopla processors** - `2a22591` (feat)

## Files Created/Modified
- `scripts/parse-hmo.js` - HMO register CSV/XLSX parser with COLUMN_MAPS per council
- `scripts/process-openrent.js` - OpenRent Apify result processor with void_days and self-managing detection
- `scripts/process-rightmove.js` - Rightmove/Zoopla Apify result processor with listing_quality_score
- `scripts/tests/test-hmo.js` - 8 tests for HMO parser (CSV variants, XLSX, postcode filtering, error handling)
- `scripts/tests/test-openrent.js` - 6 tests for OpenRent processor (landlords, void_days, postcode filtering, missing fields)
- `scripts/tests/test-rightmove.js` - 6 tests for Rightmove processor (quality scoring, void_days, postcode filtering, missing fields)

## Decisions Made
- Used csv-parse/sync (synchronous) rather than streaming since HMO register files are typically small (<10K rows)
- Listing quality score breakdown: photos 0-40, description 0-30, floorplan 0-15, EPC 0-15 (max 100)
- OpenRent source_ref captures self-managing vs agent-managed to aid lead scoring in Phase 3
- Rightmove does not create landlord records since listings display agent names, not landlord names

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed assert.rejects to assert.throws for sync function**
- **Found during:** Task 1 (HMO parser tests)
- **Issue:** Test used assert.rejects but parseHmo is synchronous, causing test to fail despite error being thrown
- **Fix:** Changed to assert.throws for synchronous error assertion
- **Files modified:** scripts/tests/test-hmo.js
- **Verification:** All 8 HMO tests pass
- **Committed in:** 20be1cb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor test assertion fix, no scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 remaining data source processors built and tested (HMO registers, OpenRent, Rightmove/Zoopla)
- Ready for Plan 03 (deduplication) and Plan 04 (integration)
- 20 total tests passing across all 3 test files

---
*Phase: 02-data-sources-deduplication*
*Completed: 2026-03-28*
