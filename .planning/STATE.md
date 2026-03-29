---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 3
status: executing
last_updated: "2026-03-29T12:32:00Z"
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 13
  completed_plans: 12
---

# Project State: SJB Property Management Launch

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Build a reliable, repeatable pipeline that identifies tired landlords and converts them into long-term property management clients
**Current focus:** Phase 03 — lead-scoring-crm
**Current Plan:** 1

## Current Milestone

**Milestone 1:** Landlord Lead Generation Pipeline (v1)
**Status:** Executing Phase 03

## Phase Status

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 1 | Data Foundation | ● Complete | 100% (3/3 plans) |
| 2 | Data Sources & Deduplication | ● Complete | 100% (3/3 plans) |
| 2.1 | Data Gathering & Scraping | ● Complete | 100% (4/4 plans) |
| 3 | Lead Scoring & CRM | ◐ In Progress | 67% (2/3 plans) |
| 4 | Compliance & Outreach Infrastructure | ○ Pending | 0% |
| 5 | BTL Management Campaign | ○ Pending | 0% |
| 6 | R2R Pipeline (HMO Only) | ○ Pending | 0% |

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-28 | BTL management before R2R | Get fee-based management flowing first |
| 2026-03-28 | R2R = HMO landlords ONLY | R2R model only works with HMOs (multi-tenant income) |
| 2026-03-28 | Semi-automated pipeline | Manual review before outreach for quality control |
| 2026-03-28 | Instantly.ai for outreach, Snov.io for email finding | Best-in-class for each function |
| 2026-03-28 | 2-3 secondary sending domains | Better deliverability, protect primary domain |
| 2026-03-28 | EPC D-G rating as primary outreach hook | Compliance stress = strongest tired landlord signal |
| 2026-03-28 | Lead-Gen toolkit rebuild needed | Previous scripts were designed but never saved |
| 2026-03-28 | SK1-SK8 for Stockport coverage | SK9+ is outside target area (Cheshire/Derbyshire) |
| 2026-03-28 | Cursor-based pagination for EPC API | Deprecated offset pagination capped at 10,000 results |
| 2026-03-28 | Strict tenure filter: 'Rented (private)' exact match | Avoids confusion with transaction-type field |
| 2026-03-28 | Companies House MCP via claude mcp add | Not project dependency; npx handles installation |
| 2026-03-28 | Temp test DB in os.tmpdir() | Avoids polluting production data/sjb-leads.db |
| 2026-03-28 | Area-based CH search (Stockport, Manchester) | CH API uses location text not postcode filtering |
| 2026-03-28 | 550 safety threshold for CH rate limit | 50-request buffer below 600 limit prevents 429 errors |
| 2026-03-28 | Officers logged not stored in DB | Valuable for Phase 3 enrichment but no schema column yet |
| 2026-03-28 | Idempotent migrations via try/catch on duplicate column name | Simpler than PRAGMA table_info checks, equally safe |
| 2026-03-28 | CCOD importer exports function for testability | Injected DB param enables unit testing with temp databases |
| 2026-03-28 | Transaction batching every 1000 rows | Balances memory usage and write performance for large CSVs |
| 2026-03-28 | Listing quality score 0-100 weighted: photos(40), desc(30), floorplan(15), EPC(15) | Quantifiable metric for lead scoring in Phase 3 |
| 2026-03-28 | OpenRent source_ref stores self-managing vs agent-managed | Aids lead prioritisation — self-managing landlords are warmer leads |
| 2026-03-28 | Rightmove creates no landlord records | Listings show agents not landlords; landlord matching via deduplication |
| 2026-03-28 | Synchronous HMO parser (csv-parse/sync) | HMO register files typically <10K rows, no need for streaming |
| 2026-03-28 | Fuse.js threshold 0.3, auto-merge <0.2, reject >0.4 | Balances precision vs recall for landlord name matching |
| 2026-03-28 | Source priority: CH > EPC > CCOD > HMO > OpenRent > Rightmove | Companies House data most authoritative for company identity |
| 2026-03-28 | Fuzzy matching scoped to same postcode outcode | Prevents false positives across geographies |
| 2026-03-28 | Review matches exported as pairs for manual inspection | Simpler to review A-vs-B than grouped clusters |
| 2026-03-28 | EPC-landlord linking deferred to Phase 3 | EPC properties have ratings but no landlord_id; requires address matching |
| 2026-03-28 | Review-matches needs Phase 3 filtering | 231K rows from 289 groups too large for manual review |
| 2026-03-29 | Fuse.js threshold 0.4 for address matching | Looser than 0.3 name matching due to address variation (flats, abbreviations) |
| 2026-03-29 | Score normalises to available signals only | Single strong signal can score 100; intentional per CONTEXT.md |
| 2026-03-29 | Portfolio size 9+ gets 0 points | Large portfolio = professional operator, not a tired landlord |
| 2026-03-29 | Address normalisation expands abbreviations | Expanding Rd->Road gives Fuse.js more characters for better matching |
| 2026-03-29 | All enrichment tiers in single file with --tier flag | Selective execution avoids running expensive tiers unnecessarily |
| 2026-03-29 | Property address as mailing fallback | 97.5% coverage; no-email leads are PRIME direct mail candidates |
| 2026-03-29 | Snov.io/Apify/Firecrawl skip gracefully when unconfigured | Script never fails on missing credentials |

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 01-01 | 3min | 2 | 7 |
| 01-02 | 3min | 2 | 3 |
| 01-03 | 3min | 1 | 2 |
| 02-01 | 3min | 2 | 7 |
| 02-02 | 4min | 2 | 6 |
| 02-03 | 4min | 2 | 4 |
| 02.1-01 | 9min | 1 | 3 |
| 02.1-04 | 10min | 1 | 6 |
| 03-01 | 6min | 3 | 6 |
| 03-02 | 5min | 4 | 3 |

## Accumulated Context

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Data Gathering & Scraping (URGENT) — Phase 2 built processors but never ran scrapers or Apify actors to populate DB with real data. Includes Google Maps Street View as an additional qualifying layer on top-priority leads (those already flagged by Rightmove data, low EPC grades, etc.) to help Sam visually assess property condition before contact decisions.

## Blockers

None currently.

---
*Last session: 2026-03-29T12:32:00Z*
*Stopped at: Completed 03-02-PLAN.md — enrichment waterfall done, 1,537/1,577 leads with mailing addresses, all flagged direct-mail-candidate*
