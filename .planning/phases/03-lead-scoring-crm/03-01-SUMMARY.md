---
phase: 03-lead-scoring-crm
plan: 01
subsystem: database
tags: [sqlite, fuse.js, scoring, lead-prioritisation, address-matching]

requires:
  - phase: 02-data-sources-dedup
    provides: "Deduplicated landlord records with match_group_id and is_primary_record"
  - phase: 02.1-data-gathering
    provides: "Populated properties with EPC ratings, void_days, listing_quality_score, HMO licences"
provides:
  - "tired_score 0-100 on all 8,556 primary/ungrouped landlords"
  - "btl_suitable and r2r_suitable classification flags"
  - "4,702 EPC properties linked to landlords via address matching"
  - "Pure scoring library (scripts/lib/scoring.js) with no DB dependency"
  - "Schema columns for Phase 3 enrichment (email, phone, linkedin_url, etc.)"
affects: [03-02-enrichment, 03-03-crm, 04-compliance-outreach, 05-btl-campaign]

tech-stack:
  added: []
  patterns: [stepped-scoring-weights, signal-normalisation, postcode-scoped-fuzzy-matching]

key-files:
  created:
    - scripts/migrate-phase3.js
    - scripts/link-epc-landlords.js
    - scripts/lib/scoring.js
    - scripts/score-landlords.js
    - scripts/tests/test-epc-linking.js
    - scripts/tests/test-scoring.js
  modified:
    - data/sjb-leads.db

key-decisions:
  - "Fuse.js threshold 0.4 for address matching (looser than 0.3 name matching due to address variation)"
  - "Address normalisation expands abbreviations (Rd->Road) rather than abbreviating (Road->Rd) for better fuzzy matching"
  - "Portfolio size 9+ gets 0 points (likely professional operator, not a tired landlord)"
  - "Score normalises to available signals only -- single strong signal can score 100"

patterns-established:
  - "Pure scoring functions with no DB dependency for testability"
  - "Postcode-scoped address matching to prevent cross-geography false positives"
  - "Stepped scoring weights (not linear) for discrete signal buckets"

requirements-completed: [INTEL-02, INTEL-03, INTEL-04]

duration: 6min
completed: 2026-03-29
---

# Phase 03 Plan 01: Lead Scoring Summary

**EPC-landlord address linking (4,702 matched) + tired landlord scoring 0-100 with BTL/R2R classification across 8,556 landlords**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-29T12:17:29Z
- **Completed:** 2026-03-29T12:23:02Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Linked 4,702 of 10,677 unlinked EPC properties to landlords via postcode + Fuse.js fuzzy address matching (44% match rate)
- Scored all 8,556 primary/ungrouped landlords 0-100 for tiredness using 5 weighted signals
- 1,577 landlords scored 50+ (pipeline candidates), 1,567 BTL suitable, 86 R2R suitable
- Pure scoring library with 17 unit tests and zero database dependencies

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + EPC-landlord address linking** - `b5948b3` (feat)
2. **Task 2: Pure scoring library with tests (TDD RED)** - `d87a7e3` (test)
3. **Task 2: Pure scoring library with tests (TDD GREEN)** - `6552d62` (feat)
4. **Task 3: Score all landlords and persist to database** - `ea8af62` (feat)

## Files Created/Modified
- `scripts/migrate-phase3.js` - Idempotent schema migration adding 11 columns (scoring + enrichment)
- `scripts/link-epc-landlords.js` - EPC-to-landlord linking via postcode + fuzzy address matching
- `scripts/lib/scoring.js` - Pure scoring functions: scoreLandlord, classifyBTL, classifyR2R
- `scripts/score-landlords.js` - Main scoring script querying DB and writing scores back
- `scripts/tests/test-epc-linking.js` - 4 tests for address matching logic
- `scripts/tests/test-scoring.js` - 17 tests for scoring and classification

## Decisions Made
- Fuse.js threshold 0.4 for address matching (slightly looser than the 0.3 used for name matching, since addresses have more variation with flat numbers, abbreviations, etc.)
- Address normalisation expands abbreviations to full words (Rd -> Road) rather than abbreviating, which gives Fuse.js more characters to work with for better matching
- Portfolio size 9+ treated as professional operator (0 points, no signal) rather than penalising
- Score normalises to available signals only -- a landlord with only one strong signal (e.g. EPC G) normalises to 100, which is intentional per CONTEXT.md

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Total scored landlords is 8,556 rather than the expected 9,545 because dedup grouping means only primary/ungrouped records are scored (non-primary records in match groups are excluded by the WHERE clause). This is correct behaviour.
- Score 50+ count (1,577) is higher than the estimated 200-400 range. This is because normalisation to available signals means landlords with even one strong signal can score high. The distribution shows 1,309 in the 75-100 range, mostly single-signal landlords with EPC D-G.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Scored landlords ready for enrichment (Plan 03-02): email, phone, LinkedIn via Snov.io + Companies House
- Schema already has enrichment columns (email, phone, linkedin_url, mailing_address, enrichment_source, enrichment_date, director_names)
- 1,577 leads at 50+ threshold provide a strong pipeline for BTL management outreach
- 86 R2R-suitable landlords identified for HMO guaranteed rent offers

## Self-Check: PASSED

All 6 created files verified on disk. All 4 commit hashes verified in git log.

---
*Phase: 03-lead-scoring-crm*
*Completed: 2026-03-29*
