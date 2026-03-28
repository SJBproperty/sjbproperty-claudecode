---
phase: 01-data-foundation
plan: 03
subsystem: database
tags: [companies-house, api, rate-limiting, sic-codes, spv, landlord-classification]

# Dependency graph
requires:
  - phase: 01-data-foundation/01-01
    provides: SQLite database, db.js connection helper, config.js with CH_API_BASE and PROPERTY_SIC_CODES
provides:
  - Companies House API scraper (scripts/companies-house.js)
  - Property SPV landlord records in landlords table with entity_type classification
  - Rate limiter pattern for 600 req/5min API constraint
  - Active director lookup per company
affects: [02-data-sources, 03-lead-scoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [rate-limiter-sliding-window, entity-type-classification, tdd-red-green]

key-files:
  created:
    - scripts/companies-house.js
    - scripts/tests/test-companies-house.js
  modified: []

key-decisions:
  - "Area-based search (Stockport, Manchester) not postcode-based for CH API"
  - "550 safety threshold below 600 rate limit for CH API"
  - "Officers fetched and logged per company but not stored in DB yet (Phase 3 enrichment)"

patterns-established:
  - "Rate limiter: sliding window with safety margin pattern"
  - "Entity classification: company_type -> ltd/llp/unknown mapping"
  - "Module exports pure functions for testing, same as epc-api.js"

requirements-completed: [INFRA-04]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 01 Plan 03: Companies House API Integration Summary

**Companies House advanced search scraper finding property SPVs by SIC code (68100/68209/68320), classifying as Ltd/LLP, fetching active directors, with sliding-window rate limiter**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T12:39:51Z
- **Completed:** 2026-03-28T12:42:29Z
- **Tasks:** 1
- **Files created:** 2

## Accomplishments
- Companies House scraper searches for active property companies by SIC codes 68100, 68209, 68320
- Entity type classification maps company_type to ltd/llp/unknown for PECR compliance
- Rate limiter prevents exceeding 600 requests per 5-minute window (550 safety threshold)
- Active directors fetched per company via /officers endpoint
- Landlord records inserted with source='companies_house' and company_number deduplication
- All 7 tests pass covering pure functions, database operations, and rate limiter logic

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests** - `80d61f4` (test)
2. **Task 1 (GREEN): Implementation** - `0a3eff3` (feat)

**Plan metadata:** [pending] (docs: complete plan)

_TDD task: RED commit (failing tests) then GREEN commit (passing implementation)_

## Files Created/Modified
- `scripts/companies-house.js` - Companies House API scraper with rate limiting, entity classification, officer lookup
- `scripts/tests/test-companies-house.js` - 7 tests covering classifyEntityType, buildSearchURL, parseCompany, insertLandlord, rate limiter, formatAddress

## Decisions Made
- Area-based search using 'Stockport' and 'Manchester' rather than postcodes, since CH advanced search uses location text not postcode filtering
- Safety margin of 50 requests below the 600 limit (stops at 550) to prevent 429 errors
- Officers data logged to console for now rather than stored in DB -- valuable for Phase 3 contact enrichment but no schema column exists yet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - COMPANIES_HOUSE_API_KEY must be set in .env (already configured per previous phases).

## Next Phase Readiness
- Phase 01 data foundation complete: database schema, EPC scraper, and Companies House scraper all operational
- Ready for Phase 02 (Data Sources & Deduplication) to link property and landlord records
- Officers data available for Phase 3 contact enrichment

---
*Phase: 01-data-foundation*
*Completed: 2026-03-28*
