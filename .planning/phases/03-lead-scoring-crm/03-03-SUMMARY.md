---
plan: "03-03"
status: complete
started: "2026-03-29T12:32:00Z"
completed: "2026-03-29T13:15:00Z"
---

# Plan 03-03 Summary: Notion CRM Export

## Objective
Push scored and enriched leads to a Notion database via API, with pipeline stage tracking and follow-up dates.

## What was built

### Scripts
- **scripts/export-notion.js** — Full Notion CRM export with deduplication, dry-run mode, CSV backup, and rate-limited API pushes (350ms between requests)

### Key features
- Deduplication: queries existing Notion leads before pushing, skips duplicates
- Dry-run mode: `--dry-run` writes JSON + CSV without touching API
- CSV backup: always produced alongside any export
- Rate limiting: 350ms between API calls (3 req/s safe limit)
- Configurable: `--min-score=N`, `--batch-size=N` CLI flags

### Notion database schema
Properties created via MCP to match export script:
- **Lead** (title), **Score** (number), **Status** (status: New/Contacted/Qualified/Proposal Sent/Won/Lost)
- **Lead Type** (select: BTL/R2R/BTL+R2R/Unclassified), **EPC Rating** (select: A-G, colour-coded)
- **BTL Suitable** / **R2R Suitable** (checkboxes)
- **Entity Type** (select: ltd/llp/individual/unknown), **Property Count** / **Void Days** (numbers)
- **Email**, **Phone**, **Mailing Address**, **Contact Name**, **Company**, **LinkedIn**, **Data Sources**
- **Source** (select: Cold outreach), **Next Follow-up** (date: 3 days from export)

### Views configured
- **All leads** — table sorted by Score DESC
- **Pipeline** — board grouped by Status, sorted by Score DESC
- **Follow-ups** — calendar by Next Follow-up date
- **Add a lead** — form for manual entry

## Results
- **1,577 leads** exported to Notion (883 new + 694 deduped on re-run)
- **0 failures** on final run
- All leads set to "New" status with "Cold outreach" source
- Follow-up dates set to 3 days from export (2026-04-01)

## Tests
- 19/19 tests passing (test-notion-export.js)

## Commits
- `1fb20ee` feat(03-03): implement Notion CRM export with dry-run and CSV backup
- `9ae6326` test(03-03): add failing tests for Notion export data transformations
- `02d7433` fix(03-03): align Notion export schema with existing SJB Leads Pipeline database
- `565e507` feat(03-03): add dedup logic and Notion API helper to export script

## Decisions
| Decision | Rationale |
| --- | --- |
| Aligned script to existing Notion schema | Sam pre-configured database with Status/Lead/Source properties |
| Added 11 custom properties via Notion MCP | Score, Lead Type, EPC Rating etc. needed as proper typed columns |
| Dedup via name matching before push | Handles partial failures gracefully on re-run |
| Source = "Cold outreach" for all scraped leads | Distinguishes from referrals/website/ads leads added manually |
| Follow-up date = export + 3 days | Ensures timely first contact without overwhelming |
