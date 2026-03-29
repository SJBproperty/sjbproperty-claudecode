# Phase 3: Lead Scoring & CRM - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Score all landlords 0-100 for "tiredness," classify as BTL-suitable and/or R2R-suitable, enrich with contact details (email, phone, LinkedIn, mailing address), and load into HubSpot CRM with pipeline stages and follow-up task automation. Produces a pipeline-ready dataset from the 9,545 landlord records built in Phases 1-2.1.

</domain>

<decisions>
## Implementation Decisions

### Scoring weights
- **Void periods: 30-40%** (heaviest signal) — 30+ days = moderate boost, 60+ days = high, 90+ days = maximum. Long voids directly cost landlords money and are the strongest tiredness indicator
- **EPC rating: 25-30%** (second heaviest) — D = low boost, E = moderate, F-G = high boost. EPC compliance is the primary outreach hook
- **Listing quality: 15-20%** — Maps from existing listing_quality_score (0-100) on properties table. Poor listing = landlord not investing in presentation
- **Self-managing status: 10-15%** — OpenRent source_ref stores self-managing vs agent-managed. Self-managing = warm lead. Only 110 OpenRent landlords have this data but it's a strong signal where available
- **Portfolio size: sweet spot 2-5 properties** — 1 property = hobby landlord (unlikely to pay for management). 6+ = probably already has agent. 2-5 is the target range for BTL management conversion
- **Compliance gaps: use what's available** — EPC rating is the primary compliance signal. If gas safety/EICR data becomes available, incorporate it. Don't fabricate signals from missing data
- **No multi-source adjustment** — Score purely on signal strength. A landlord from one source with terrible EPC is still a good lead

### Score thresholds
- **50+ = enters pipeline** — Targets approximately 200-300 leads from the 9,545 total
- Leads below 50 remain in database but are not pushed to CRM or enriched (initially)
- Can expand enrichment to lower-scored leads if campaign needs more volume or Snov.io credits allow

### BTL vs R2R classification
- **R2R = simple binary** — Has HMO licence in database (from hmo-register source) = R2R eligible. 2,103 HMO register records available
- **Both flags allowed** — A landlord can be flagged BTL-suitable AND R2R-suitable simultaneously. HMO landlord with non-HMO properties gets both. Different pitches for different properties
- **BTL suitability = multiple tired signals stacking** — Any 2+ of: long voids, poor EPC, low listing quality, self-managing, no agent. More stacking signals = more likely to need management help
- **Tired score 50+ and not exclusively HMO = BTL-suitable by default** — The tired score itself captures the overwhelm signals

### Contact enrichment — tiered waterfall

- **Tier 0a: CH filing email extraction (free)** — Scrape confirmation statements/annual returns for email addresses listed in filings. First pass before burning any paid credits
- **Tier 0b: OpenRent rescrape for contact fields** — Rescrape OpenRent listings via Apify targeting landlord contact details (email, phone) instead of listing quality. Free data, run before paid tools
- **Tier 1: Snov.io (50 free trial credits, Stockport only)** — Top 50 Stockport leads by score. Company name + director name (from CH officer lookup). Stop when credits exhausted. Free trial only, no paid subscription
- **Tier 2: Apify email finder actors** — Next batch of leads. LinkedIn/web scraping for director names. Pay-per-result
- **Tier 3: Firecrawl crawl** — Crawl company websites (if found), LinkedIn pages. Catches embedded emails missed by API tools
- **Tier 4: No email found → flag for Stannp direct mail** — These go straight to the letter channel. Property address or CH registered office. PRIME candidates — older landlords without digital presence
- **Snov.io as final mop-up** — After tiers 0-3, any remaining unfound emails get one last Snov.io attempt if credits remain
- **Companies House directors:** Auto-extract registered office addresses for direct mail. Flag service addresses (accountants, formations agents, etc.) — only use residential-looking addresses
- **No-contact leads = PRIME direct mail candidates** — Lack of digital presence signals older/less tech-savvy landlord. Do NOT deprioritise. These are prime approach candidates for letters

### Enrichment schema

- Add columns directly to landlords table: email, phone, linkedin_url, mailing_address, enrichment_source, enrichment_date
- Simple approach — everything in one place, no separate contacts table

### Notion CRM (replaces HubSpot)
- **Tool:** Notion free tier via API (unlimited pages/database rows). MCP server configured: `@notionhq/notion-mcp-server` with API token in .env
- **Import method:** Script pushes scored+enriched leads to Notion database via API. Re-run when data refreshes
- **Pipeline:** Single Notion database with Board view grouped by pipeline stage. BTL/R2R as a select property for filtering
- **Stages:** New Lead → Contacted → Follow Up → Consultation Booked → Proposal Sent → Signed → Onboarding
- **Follow-up automation:** Follow-up date property calculated by script (3 days after creation). n8n integration deferred to Phase 4/5 for automated reminders
- **Properties to push:** tired_landlord_score, btl_suitable, r2r_suitable, entity_type, property_count, data_sources, epc_rating, void_days, email, phone, mailing_address, lead_type

### Claude's Discretion
- Exact weight percentages within the ranges specified (e.g. 35% vs 38% for voids)
- Score formula implementation (linear vs stepped vs logarithmic)
- How to handle landlords with no void data (OpenRent/Rightmove data is sparse)
- Notion database schema specifics and property types
- Apify email finder actor selection
- LinkedIn Apify actor selection
- Firecrawl crawl configuration for company websites
- Service address detection heuristics for Companies House addresses

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Business context, two arms (BTL management 10% fee vs R2R commercial lease), target geography, constraints
- `.planning/REQUIREMENTS.md` — INTEL-02 through INTEL-05, CRM-01 through CRM-03 define this phase's 7 requirements
- `.planning/ROADMAP.md` — Phase 3 success criteria, tool setup pause (Snov.io $30/mo, HubSpot free CRM)

### Prior phase context
- `.planning/phases/01-data-foundation/01-CONTEXT.md` — Project structure (flat JS, SQLite, .env), database design, EPC data scope
- `.planning/phases/02-data-sources-deduplication/02-CONTEXT.md` — Dedup rules, source priority (CH > EPC > CCOD > HMO > OpenRent > Rightmove), export specs
- `.planning/phases/02.1-data-gathering-scraping/02.1-CONTEXT.md` — Tool priority chain (Apify > Firecrawl > Playwright), execution decisions

### Existing code (reuse/extend)
- `scripts/lib/db.js` — SQLite connection module (extend for new columns)
- `scripts/lib/config.js` — Shared postcodes and config constants
- `scripts/build-lead-list.js` — CSV export pipeline (extend for HubSpot import format)
- `scripts/lib/dedup.js` — Dedup engine (landlord matching logic reusable for enrichment matching)

### Data files
- `data/exports/snov-io-import-2026-03-28.csv` — Already formatted for Snov.io email finder upload
- `data/exports/high-priority-leads-2026-03-28.csv` — Current high-priority lead export (will be superseded by scored output)

### No external specs
No external API documentation or ADRs exist in the project. HubSpot API docs, Snov.io API docs, and Vibe Prospecting MCP docs are publicly available — researcher should fetch current documentation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/build-lead-list.js` — CSV export pipeline with 5 date-stamped exports. Extend for HubSpot import CSV format
- `scripts/lib/db.js` — SQLite connection and helpers. Needs migration for new enrichment columns
- `scripts/lib/config.js` — Shared postcodes, API bases. Extend with Snov.io and HubSpot config
- `scripts/companies-house.js` — Already queries CH API. Reuse director/registered address lookup logic for enrichment
- `scripts/lib/dedup.js` — Fuse.js fuzzy matching. Pattern reusable for matching enrichment results to landlord records

### Established Patterns
- Plain JavaScript (Node.js), no TypeScript, no build step
- `require('dotenv').config()` for API keys (add Snov.io, HubSpot keys to .env)
- Scripts in `scripts/`, data in `data/` (gitignored)
- SQLite at `data/sjb-leads.db` — landlords table (9,545 records) and properties table (40,209 records)
- Listing quality already scored 0-100 on properties (photos 40%, desc 30%, floorplan 15%, EPC 15%)
- Apify MCP tools available for actor discovery and execution (LinkedIn actors)

### Integration Points
- New scoring script reads landlords + properties tables, writes score back to landlords table (new columns needed)
- Enrichment script reads scored landlords, calls Snov.io/Vibe Prospecting/CH APIs, writes contact fields back to landlords table
- HubSpot export script reads scored+enriched landlords, produces HubSpot-format CSV
- Companies House companies already have company_number — lookup registered office addresses via CH API

</code_context>

<specifics>
## Specific Ideas

- No-contact landlords are PRIME direct mail candidates — lack of digital footprint signals older/less tech-savvy landlord who may be more receptive to professional management help. Do not deprioritise these
- Sam will add more Snov.io credits rather than wait a billing cycle if initial batch runs out
- BTL management (10% fee) does NOT include refurb — refurb/upgrades are only part of the R2R commercial lease model
- Street View URLs for top leads deferred from Phase 2.1 — could be added to HubSpot records as a visual qualifying layer for Sam to review from Abu Dhabi
- Officers data from CH was logged but not stored in Phase 1 — Phase 3 may need to re-query CH for director details during enrichment

</specifics>

<deferred>
## Deferred Ideas

- **Google Maps Street View URLs** — Add to top-priority lead exports for visual property condition assessment. Deferred from Phase 2.1, could be a quick add during or after Phase 3
- **Automated re-scraping schedule** — v2 requirement (AUTO-01). Re-run data pipeline periodically to catch new listings
- **Score refinement from conversion data** — v2 requirement (AUTO-02). Adjust weights based on which scored leads actually convert
- **Automated CRM sync** — v2 requirement (AUTO-03). Replace CSV import with live SQLite-to-HubSpot API sync

</deferred>

---

*Phase: 03-lead-scoring-crm*
*Context gathered: 2026-03-29*
