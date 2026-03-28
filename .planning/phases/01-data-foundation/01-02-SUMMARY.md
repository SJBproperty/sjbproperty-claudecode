---
phase: 01-data-foundation
plan: 02
subsystem: epc-scraper
tags: [epc, api, scraper, playwright, rental-properties]

# Dependency graph
requires:
  - SQLite database schema (from 01-01)
  - Shared db.js and config.js modules (from 01-01)
provides:
  - EPC Register API scraper (scripts/epc-api.js)
  - Playwright fallback EPC scraper (scripts/scrape-epc.js)
  - EPC integration tests (scripts/tests/test-epc.js)
affects: [01-03-PLAN, phase-2-land-registry-linking]

# Tech tracking
tech-stack:
  added: []
  patterns: [cursor-pagination, basic-auth, field-mapping-hyphen-to-underscore, insert-or-ignore, playwright-cli-fallback]

key-files:
  created:
    - scripts/epc-api.js
    - scripts/scrape-epc.js
    - scripts/tests/test-epc.js
  modified: []

key-decisions:
  - "Cursor-based pagination via search-after header (not deprecated offset pagination capped at 10,000)"
  - "Strict tenure filter: only 'Rented (private)' exact match, not transaction-type"
  - "Deduplication by UPRN with fallback to address+postcode when UPRN is missing"
  - "Playwright scraper uses URL params for filtering rather than form filling"

patterns-established:
  - "Exported pure functions for testing: buildURL, parseEPCRow, filterRental, deduplicateByUPRN, insertProperties"
  - "insertProperties accepts a database parameter for test injection (temp DB)"
  - "CLI argument interface: node scripts/epc-api.js SK1 SK2 (defaults to config postcodes)"

requirements-completed: [INFRA-03]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 01 Plan 02: EPC Register API Scraper Summary

**EPC API scraper with Basic Auth, cursor pagination, D-G rental filter, UPRN deduplication, and Playwright fallback -- 8 passing tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T12:33:43Z
- **Completed:** 2026-03-28T12:36:57Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- EPC Register API scraper fetches D-G rated rental properties using cursor-based pagination (search-after), handles authentication via Basic Auth (Base64 email:apikey), filters to private rentals only, deduplicates by UPRN keeping latest EPC, and inserts with correct field mapping and source provenance
- Playwright fallback scraper provides alternative data collection when API is unavailable, using distinct source='epc_scraper' provenance
- 8 integration tests verify URL construction, field mapping (hyphenated to underscored), tenure filtering, UPRN deduplication, INSERT OR IGNORE behaviour, and source/timestamp provenance

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): EPC tests** - `a91c00d` (test)
2. **Task 1 (GREEN): EPC API scraper** - `010ba1f` (feat)
3. **Task 2: Playwright fallback** - `c43d714` (feat)

## Files Created
- `scripts/epc-api.js` - EPC Register API scraper with cursor pagination, rental filter, UPRN dedup, bulk insert
- `scripts/scrape-epc.js` - Playwright-based fallback scraper using playwright-cli skill
- `scripts/tests/test-epc.js` - 8 tests covering all pure functions and database operations

## Decisions Made
- Cursor-based pagination via `search-after` header, not deprecated offset pagination (which caps at 10,000 results)
- Strict tenure filter: only exact match `Rented (private)`, not filtering on `transaction-type` alone (see Pitfall 2 in RESEARCH.md)
- Deduplication by UPRN with fallback to address+postcode composite key when UPRN is missing
- Playwright scraper uses URL query params for EPC website filtering rather than form interaction (simpler, more reliable)
- `insertProperties` accepts a database parameter so tests can inject a temporary database

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness
- Properties table can now be populated with D-G rated rental properties from target postcodes
- landlord_id remains NULL for EPC properties (as expected - EPC API does not return landlord names)
- Property-to-landlord linking is a Phase 2 concern via Land Registry CCOD
- Companies House scraper (Plan 01-03) will populate the landlords table independently

## Self-Check: PASSED

---
*Phase: 01-data-foundation*
*Completed: 2026-03-28*
