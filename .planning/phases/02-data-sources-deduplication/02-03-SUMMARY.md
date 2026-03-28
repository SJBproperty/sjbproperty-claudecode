---
phase: 02-data-sources-deduplication
plan: 03
subsystem: deduplication
tags: [fuse.js, csv-stringify, deduplication, fuzzy-matching, lead-export, snov-io]

# Dependency graph
requires:
  - phase: 02-data-sources-deduplication
    plan: 01
    provides: normalise.js, config.js, db.js, CCOD importer, Phase 2 schema migration
  - phase: 02-data-sources-deduplication
    plan: 02
    provides: HMO parser, OpenRent/Rightmove processors with listing quality scoring
provides:
  - dedup.js — two-pass deduplication engine (exact + fuzzy matching)
  - build-lead-list.js — orchestrates dedup + 5 CSV exports
affects:
  - Phase 3 Lead Scoring will consume deduplicated lead lists
  - Snov.io CSV feeds email finding in Phase 3

# Tech stack
added:
  - fuse.js (fuzzy string matching, already in package.json)
  - csv-stringify/sync (CSV generation, already in package.json)
patterns:
  - TDD red-green for both modules
  - Testable exports with require.main guard for CLI usage
  - Temp SQLite DB in os.tmpdir() for isolated integration tests

# Key files
created:
  - scripts/lib/dedup.js
  - scripts/build-lead-list.js
  - scripts/tests/test-dedup.js
  - scripts/tests/test-build-lead-list.js
modified: []

# Decisions
key-decisions:
  - "Fuse.js threshold 0.3, auto-merge below 0.2, reject above 0.4 — balances precision vs recall for name matching"
  - "Source priority companies-house > epc > ccod > hmo-register > openrent > rightmove for primary record selection"
  - "Fuzzy matching scoped to same postcode outcode — prevents false positives across geographies"
  - "Review matches exported as pairs (A vs B) for manual inspection rather than grouped records"

# Metrics
duration: 4min
completed: "2026-03-28T15:55:00Z"
tasks_completed: 2
tasks_total: 2
---

# Phase 02 Plan 03: Deduplication Engine and CSV Export Pipeline Summary

Two-pass deduplication engine (exact company_number/UPRN match then Fuse.js fuzzy name matching within postcode outcode areas) with source-priority merging and 5 date-stamped CSV exports for downstream lead scoring, email finding, and HMO targeting.

## What Was Built

### Task 1: Deduplication Engine (`scripts/lib/dedup.js`)
- **`findExactMatches(db)`** — Pass 1: groups landlords by shared company_number or shared UPRN on their properties. Returns match groups with confidence 1.0.
- **`findFuzzyMatches(db, options)`** — Pass 2: uses Fuse.js to compare normalised landlord names within the same postcode outcode area. Scores below 0.2 auto-merge; 0.2-0.4 flagged for review; above 0.4 rejected.
- **`mergeRecords(db, matchGroups)`** — Applies merge results: assigns sequential match_group_id, sets match_confidence, determines primary record by source priority (companies-house > epc > ccod > hmo-register > openrent > rightmove).

### Task 2: Build Lead List (`scripts/build-lead-list.js`)
- Orchestrates full dedup pipeline (exact then fuzzy), then generates 5 CSV exports:
  - **all-leads-{date}.csv** — All deduplicated landlords (primary records only from groups)
  - **high-priority-leads-{date}.csv** — Landlords with identifiable name AND EPC D-G rated properties
  - **hmo-landlords-{date}.csv** — Landlords with HMO licence numbers
  - **snov-io-import-{date}.csv** — Ltd/LLP companies formatted for Snov.io email finder (First Name, Last Name, Company Name, Location: Greater Manchester, Country: UK, Position: Director)
  - **review-matches-{date}.csv** — Uncertain fuzzy matches for manual inspection (pair-wise with shared postcodes)

## Test Coverage

- **test-dedup.js**: 11 tests — exact matching (company_number, UPRN, null handling), fuzzy matching (auto-merge, no-match, cross-area isolation), merging (primary selection, group assignment, confidence storage, source priority)
- **test-build-lead-list.js**: 7 tests — CSV file creation, dedup row reduction, high-priority filtering (EPC D-G only), HMO inclusion, Snov.io format validation, review-matches existence, date-stamped filenames

## Commits

| Commit | Description |
|--------|-------------|
| 5dc9205 | feat(02-03): add deduplication engine with exact and fuzzy matching |
| 1f53179 | feat(02-03): add build-lead-list pipeline with 5 CSV exports |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- All 4 created files exist on disk
- Both commits (5dc9205, 1f53179) verified in git log
- 18/18 tests pass across both test files
