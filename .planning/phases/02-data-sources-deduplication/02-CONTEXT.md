# Phase 2: Data Sources & Deduplication - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Capture 4 additional data sources (Land Registry CCOD, OpenRent, Council HMO registers, Rightmove/Zoopla) and deduplicate all landlord records — including Phase 1 EPC and Companies House data — into unified profiles with source provenance. Produces 4 prioritised CSV exports for downstream use.

</domain>

<decisions>
## Implementation Decisions

### Data source approach
- **Land Registry CCOD:** Script auto-downloads the free bulk CSV from Land Registry, parses, and imports corporate-owned titles in target postcodes
- **OpenRent:** Apify Actor via Claude MCP orchestration — captures self-managing landlords with listing quality and void period data in target areas
- **Council HMO registers:** Parse existing CSV files Sam already has (Stockport and Manchester). FOI requests already submitted for fresh data — script should handle both current dated files and future FOI responses
- **Rightmove/Zoopla:** Apify Actors via Claude MCP orchestration — ToS risk accepted at this scale. If Actors get delisted, fall back to manual research. Used for void period analysis and listing quality scoring

### Scraping workflow
- Claude MCP orchestration for all Apify Actor runs (not standalone scripts)
- Claude calls Apify MCP tools directly, processes results, saves to database
- Each scrape is a Claude session interaction
- HMO register parsing is a standalone Node.js script (`parse-hmo.js`) since it reads local CSV files

### Deduplication rules
- **Auto-merge high confidence:** Exact company number match, OR name + same postcode
- **Flag uncertain matches:** Fuzzy name match without address overlap goes to manual review
- **Source priority for conflicts:** Companies House > EPC Register > all other sources
- **Review output:** CSV report (`data/exports/review-matches-YYYY-MM-DD.csv`) listing uncertain matches with: landlord A, landlord B, match confidence score, shared fields

### Output & exports
- **High priority definition:** Has identifiable landlord name or company number AND has EPC rating D-G
- **4 output CSVs** as per roadmap: all-leads, high-priority-leads, hmo-landlords, snov-io-import (all date-stamped)
- **Snov.io import format:** To be researched — researcher should look up Snov.io's required CSV columns for email finding import
- **CSV location:** Claude's discretion within data/ directory

### Claude's Discretion
- Exact fuzzy matching algorithm and confidence thresholds
- CSV export location within data/ directory (flat vs subfolder)
- CCOD download URL and parsing logic
- Rate limiting strategy for Apify Actor runs
- HMO register CSV column mapping (varies by council)
- Whether to install xlsx package now or wait for FOI Excel files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Business context, target geography (SK1-SK8, M14, M19, M20, M21, M22), two business arms
- `.planning/REQUIREMENTS.md` — DATA-01 through DATA-04 and INTEL-01 define this phase's requirements
- `.planning/ROADMAP.md` — Phase 2 success criteria, key scripts to build, output CSV specs

### Phase 1 context and code
- `.planning/phases/01-data-foundation/01-CONTEXT.md` — Project structure decisions (flat layout, plain JS, SQLite, .env)
- `scripts/lib/db.js` — Database connection module (reuse for Phase 2 scripts)
- `scripts/lib/config.js` — Shared config (postcodes, API bases — extend for new sources)
- `scripts/init-db.js` — Current schema (landlords + properties tables — may need columns for new source fields)

### No external specs
No external API documentation or ADRs exist in the project. Land Registry CCOD format docs, Apify Actor docs, and Snov.io import format are publicly available online — researcher should fetch current documentation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/lib/db.js` — SQLite connection and helper, reuse for all new data source scripts
- `scripts/lib/config.js` — Shared constants (POSTCODES, API bases), extend with new source configs
- `scripts/epc-api.js` — Pattern for API-based data ingestion with rate limiting
- `scripts/companies-house.js` — Pattern for API scraping with pagination and error handling

### Established Patterns
- Plain JavaScript (Node.js), no TypeScript, no build step
- `require('dotenv').config()` at top of each script for API keys
- Scripts in `scripts/`, data in `data/` (gitignored)
- SQLite with `landlords` and `properties` tables, source provenance per record

### Integration Points
- New data inserts into existing `landlords` and `properties` tables
- May need new columns for source-specific fields (e.g., HMO licence number, OpenRent listing URL, CCOD title number)
- Deduplication script reads all existing records and produces unified profiles
- Export script reads deduplicated data and writes CSVs to data/ directory

</code_context>

<specifics>
## Specific Ideas

- Vibe Prospecting MCP should be used in Phase 3 for contact enrichment alongside Snov.io
- HMO register files are already available locally as CSV — FOI requests already submitted for fresh data
- Build parser that handles both CSV and XLSX formats (install xlsx package when Excel files arrive from FOI)

</specifics>

<deferred>
## Deferred Ideas

- **Google Maps/Street View visual scoring** — Use satellite/street imagery to identify tired-looking properties as a tiredness signal. Would become a top-priority indicator when combined with poor EPC. New data source, belongs in its own phase or as a Phase 2 enhancement later.
- **Vibe Prospecting MCP for enrichment** — Contact enrichment tool to fill incomplete landlord records. Fits Phase 3 (INTEL-05) alongside Snov.io.

</deferred>

---

*Phase: 02-data-sources-deduplication*
*Context gathered: 2026-03-28*
