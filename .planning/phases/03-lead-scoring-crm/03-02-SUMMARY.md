---
phase: 03-lead-scoring-crm
plan: 02
subsystem: database
tags: [sqlite, companies-house, snov-io, enrichment, contact-finding, direct-mail]

requires:
  - phase: 03-lead-scoring-crm
    provides: "1,577 scored landlords at 50+ with tired_score, btl_suitable, r2r_suitable"
provides:
  - "Tiered contact enrichment waterfall: CH officers -> CH filings -> OpenRent -> Snov.io -> Apify -> Firecrawl -> direct mail flag"
  - "1,537 of 1,577 leads enriched with mailing addresses (97.5% coverage)"
  - "Service address detection for CH registered offices"
  - "All 1,577 no-email leads flagged as direct-mail-candidate"
  - "Injectable fetcher pattern for testable API integrations"
affects: [03-03-crm, 04-compliance-outreach, 05-btl-campaign]

tech-stack:
  added: []
  patterns: [tiered-enrichment-waterfall, injectable-fetcher-for-testing, service-address-detection]

key-files:
  created:
    - scripts/enrich-contacts.js
    - scripts/tests/test-enrichment.js
  modified:
    - scripts/lib/config.js
    - data/sjb-leads.db

key-decisions:
  - "All tiers implemented in single file with --tier flag for selective execution"
  - "OpenRent and Apify/Firecrawl tiers log and skip gracefully when MCP tools unavailable"
  - "Snov.io skips gracefully when credentials not in .env -- no script failure"
  - "Property address used as mailing address fallback for 97.5% of leads"
  - "All no-email leads flagged as direct-mail-candidate per CONTEXT.md (PRIME targets)"

patterns-established:
  - "Injectable fetchFn parameter for mocking HTTP calls in tests"
  - "Tiered enrichment with early exit: stop enriching a lead once email found"
  - "Service address keyword detection for CH registered office filtering"

requirements-completed: [INTEL-05]

duration: 5min
completed: 2026-03-29
---

# Phase 03 Plan 02: Contact Enrichment Summary

**Tiered contact enrichment waterfall with CH officer/filing lookup, service address detection, and property address fallback covering 97.5% of 1,577 leads**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T12:26:44Z
- **Completed:** 2026-03-29T12:31:44Z
- **Tasks:** 4
- **Files modified:** 3

## Accomplishments
- Built tiered enrichment waterfall with 7 tiers (CH officers, CH filings, OpenRent, Snov.io, Apify, Firecrawl, direct mail flag)
- Enriched 1,537 of 1,577 leads with mailing addresses via property address fallback (97.5% coverage)
- 1 Ltd/LLP landlord enriched with director names from Companies House
- All 1,577 no-email leads flagged as direct-mail-candidate (PRIME targets per CONTEXT.md)
- 18 unit tests validating service address detection, email extraction, CH enrichment, ordering, and tier filtering

## Task Commits

Each task was committed atomically:

1. **Task 1: CH officer lookup + filing emails + mail fallback + tests** - `a928935` (feat)
2. **Tasks 2-3: OpenRent/Snov.io/Apify/Firecrawl tiers** - included in `a928935` (all tiers written together for file coherence)
3. **Task 4: Live database enrichment run** - no file changes (DB in gitignored data/)

## Files Created/Modified
- `scripts/enrich-contacts.js` - Tiered contact enrichment waterfall (all 7 tiers, CLI with --tier flag)
- `scripts/tests/test-enrichment.js` - 18 tests for enrichment logic with mocked APIs
- `scripts/lib/config.js` - Added SNOV_API_BASE constant

## Decisions Made
- Wrote all enrichment tiers in a single commit for file coherence rather than spreading across 3 commits with partial implementations
- OpenRent rescrape tier logs and skips since actors typically don't expose landlord email/phone -- best-effort as specified
- Apify email finder and Firecrawl tiers require MCP tools and log clear instructions for manual execution
- Snov.io integration fully implemented with credit tracking, auth, and rate limiting -- ready when credentials are added to .env

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Consolidated Tasks 1-3 into single file creation**
- **Found during:** Task 1
- **Issue:** Creating partial file in Task 1 then modifying in Tasks 2-3 would create incomplete intermediate states
- **Fix:** Built all tiers in the initial file creation, committed once with all functionality
- **Files modified:** scripts/enrich-contacts.js
- **Verification:** All 18 tests pass, all tiers work independently via --tier flag
- **Committed in:** a928935

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Single deviation for file coherence. All planned functionality delivered.

## Issues Encountered
- Only 1 Ltd/LLP landlord with a company_number exists in the scored leads -- most landlords are individuals from EPC/OpenRent/HMO sources without company numbers, so CH officer lookup has low yield in this dataset
- No emails found via CH filings (0% yield on the 1 company checked) -- expected given the low volume of Ltd companies
- Snov.io credentials not yet configured, so Tier 1 was skipped gracefully
- 40 landlords (2.5%) have no properties linked, so mailing address fallback couldn't find an address for them

## User Setup Required

For email enrichment beyond free CH tiers, configure:
- **Snov.io:** Add `SNOV_CLIENT_ID` and `SNOV_CLIENT_SECRET` to `.env` (sign up at https://snov.io, 50 free credits)
- **Apify/Firecrawl:** Use MCP tools to run email finder actors and website crawls

## Next Phase Readiness
- 1,537 leads have mailing addresses ready for Stannp direct mail (Phase 4/5)
- All leads flagged as direct-mail-candidate for outreach pipeline
- Enrichment script ready for re-run when Snov.io credentials are added
- Schema and data ready for Notion CRM push (Plan 03-03)

## Self-Check: PASSED

All created files verified on disk. Commit hash a928935 verified in git log.

---
*Phase: 03-lead-scoring-crm*
*Completed: 2026-03-29*
