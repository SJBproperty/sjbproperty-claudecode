---
phase: 05-btl-management-campaign
plan: 01
subsystem: api
tags: [csv-export, stannp, direct-mail, better-sqlite3, csv-stringify]

# Dependency graph
requires:
  - phase: 04-compliance-outreach-infra
    provides: suppression filter and export-filters library
provides:
  - Stannp-format CSV export script for direct mail batches
  - Address waterfall logic (owner > mailing > property)
  - Name formatting for company vs individual landlords
  - UK postcode extraction utility
affects: [05-btl-management-campaign, 06-r2r-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD with node:test, address waterfall selection, entity-type-aware name formatting]

key-files:
  created:
    - scripts/export-stannp.js
    - scripts/tests/test-stannp-export.js
  modified: []

key-decisions:
  - "First director name used for salutation when multiple directors exist"
  - "MIN(current_energy_rating) selects worst EPC as merge field for letter personalisation"
  - "Address source tracking logged for export quality monitoring"

patterns-established:
  - "Address waterfall: owner_address > mailing_address > property address for all mail exports"
  - "Entity-aware name formatting: ltd/llp use director names, individuals split name field"

requirements-completed: [OUT-BTL-01]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 5 Plan 1: Stannp CSV Export Summary

**Stannp-format CSV export with address waterfall, entity-aware name formatting, and 12 TDD test cases**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T16:34:28Z
- **Completed:** 2026-04-01T16:36:40Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Stannp CSV export script producing correctly formatted file with all required merge fields (title, firstname, lastname, company, address1, address2, city, postcode, country, epc_rating, property_count, property_address)
- Address waterfall selects best available mailing address per lead: owner_address > mailing_address > property address
- Name formatting handles ltd/llp with directors (uses director name), ltd without directors (company only), and individuals (splits name)
- 12 comprehensive test cases all passing covering columns, suppression, BTL filter, ordering, address waterfall, name formatting, postcode extraction, batch limiting, no-address exclusion, and dedup exclusion

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Stannp export tests** - `d3aab46` (test)
2. **Task 1 (GREEN): Stannp export implementation** - `833b805` (feat)

## Files Created/Modified
- `scripts/export-stannp.js` - Stannp CSV export with SQL query, address waterfall, name formatting, postcode extraction
- `scripts/tests/test-stannp-export.js` - 12 test cases using node:test framework with temp DB

## Decisions Made
- First director name (from comma-separated list) used for salutation when entity has multiple directors
- MIN(current_energy_rating) selects the worst EPC rating as the merge field, giving the strongest compliance hook
- Address source breakdown logged to console for monitoring export quality

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration.** The plan frontmatter specifies:
- Stannp account creation at stannp.com
- STANNP_API_KEY environment variable from Stannp Dashboard API Settings
- 3-page booklet PDF template upload with merge field placeholders: {firstname}, {lastname}, {company}, {epc_rating}, {property_count}, {property_address}

These are needed for actual mail dispatch but not for CSV generation.

## Next Phase Readiness
- CSV export ready for Stannp bulk recipient import
- Script can be run via `node scripts/export-stannp.js [batchSize]`
- Subsequent plans can build letter content/template and Stannp API integration

## Self-Check: PASSED

- FOUND: scripts/export-stannp.js
- FOUND: scripts/tests/test-stannp-export.js
- FOUND: d3aab46 (test commit)
- FOUND: 833b805 (feat commit)

---
*Phase: 05-btl-management-campaign*
*Completed: 2026-04-01*
