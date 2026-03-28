# Roadmap: SJB Property Management Launch — Landlord Lead Generation

**Created:** 2026-03-28
**Phases:** 6
**Requirements:** 28 mapped (100% coverage)
**Mode:** Interactive (confirm at each step)
**Execution:** Sequential

---

## Phase 1: Data Foundation

**Goal:** Database schema, MCP tooling, and free government API scrapers operational — producing landlord data from EPC Register and Companies House for target postcodes.

**Requirements:** INFRA-01, INFRA-02, INFRA-03, INFRA-04

**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold, database schema, shared libraries, MCP configuration
- [x] 01-02-PLAN.md — EPC Register API scraper and Playwright fallback
- [x] 01-03-PLAN.md — Companies House API scraper with entity classification

**Success Criteria:**
1. SQLite database exists with landlord, property, and lead tables including entity type field (Ltd/LLP vs sole trader) and source provenance
2. Claude Code can query EPC Register API and return D-G rated rental properties in SK, M14, M19, M20, M21, M22 postcodes with landlord names and addresses
3. Claude Code can query Companies House API and classify landlords as Ltd/LLP vs sole trader
4. MCP servers (Apify, Playwright, Companies House) are installed, configured, and responding to commands

**Tool setup pause:** Before execution, install and configure required MCP servers. Register for EPC Open Data API key and Companies House API key.

**Key scripts to build:**
- `epc-api.js` — EPC open data API scraper (filter D-G rated, rental tenure, target postcodes)
- `scrape-epc.js` — Playwright fallback EPC scraper (no API key needed)
- `companies-house.js` — Companies House property company search + director lookup
- Database schema and init script

---

## Phase 2: Data Sources & Deduplication

**Goal:** All 5 data sources captured and landlord records deduplicated into unified profiles with source provenance.

**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04, INTEL-01

**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Schema migration, shared libraries, and Land Registry CCOD importer
- [x] 02-02-PLAN.md — HMO register parser and OpenRent/Rightmove Apify result processors
- [x] 02-03-PLAN.md — Deduplication engine and CSV export pipeline

**Success Criteria:**
1. Land Registry CCOD corporate ownership data for target postcodes loaded into database
2. OpenRent self-managing landlords in target areas captured with listing quality and void period data
3. Council HMO register data imported (existing dated register as baseline; FOI requests submitted for fresh data)
4. Landlord records from all sources deduplicated into unified profiles using name fuzzy matching, address normalisation, UPRN, and company number

**Tool setup pause:** Before execution, configure Apify Actors for OpenRent (and Rightmove/Zoopla if proceeding despite ToS risk). Download Land Registry CCOD dataset. Prepare HMO register files.

**Key scripts to build:**
- `parse-hmo.js` — HMO register CSV/XLSX parser
- `build-lead-list.js` — merge all sources, deduplicate, export prioritised CSVs
- OpenRent scraper (via Apify MCP)
- Rightmove/Zoopla scraper (via Apify MCP — ToS risk noted)
- Land Registry CCOD importer

**Output CSVs:**
- `all-leads-YYYY-MM-DD.csv` — everything
- `high-priority-leads-YYYY-MM-DD.csv` — has name/company + poor EPC
- `hmo-landlords-YYYY-MM-DD.csv` — HMO landlords with names
- `snov-io-import-YYYY-MM-DD.csv` — ready for Snov.io email finding

---

## Phase 3: Lead Scoring & CRM

**Goal:** Landlords scored 0-100 for "tiredness," classified as BTL or R2R suitable, enriched with contact details, and loaded into HubSpot CRM.

**Requirements:** INTEL-02, INTEL-03, INTEL-04, INTEL-05, CRM-01, CRM-02, CRM-03

**Success Criteria:**
1. Every landlord has a tired landlord score (0-100) based on weighted signals: void periods, EPC rating (D-G), compliance gaps, listing quality, portfolio size
2. Leads classified as BTL-suitable (self-managing, 1-5 properties, overwhelm signals) or R2R-suitable (HMO landlords ONLY — licensed HMO properties)
3. Contact enrichment attempted for all scored leads — phone and email via Snov.io email finder, 192.com, Companies House director addresses, LinkedIn
4. HubSpot CRM pipeline live with stages: New Lead → Contacted → Consultation Booked → Proposal Sent → Signed → Onboarding
5. Follow-up tasks auto-create in HubSpot so no lead falls through cracks

**Tool setup pause:** Before execution, sign up for Snov.io ($30/mo) for email finding. Set up HubSpot free CRM account. Configure API access.

---

## Phase 4: Compliance & Outreach Infrastructure

**Goal:** GDPR/PECR documentation in place, ICO registration renewed, suppression list live, 2-3 secondary sending domains purchased and email warmup started.

**Requirements:** COMP-01, COMP-02, COMP-03, COMP-04

**Success Criteria:**
1. Legitimate Interest Assessment (LIA) documented for B2B landlord marketing under UK GDPR
2. PECR entity type gate enforced in pipeline — email outreach ONLY to Ltd/LLP landlords; sole traders receive direct mail and phone only
3. Privacy notice and data retention policy created, ready to share on request
4. Suppression list mechanism in place to track opt-outs and prevent re-contacting
5. 2-3 secondary sending domains purchased (e.g. sjbproperty.co.uk), Zoho Mail configured, email warmup started via Instantly.ai (3-4 week process)

**Tool setup pause:** Before execution, purchase secondary domains on Namecheap/Cloudflare. Set up Zoho Mail (free). Sign up for Instantly.ai ($30/mo). Renew ICO registration (£52/year).

**Calendar dependency:** Email warmup takes 3-4 weeks. Start immediately upon entering this phase. BTL email campaigns (Phase 5) cannot launch until warmup is complete.

---

## Phase 5: BTL Management Campaign

**Goal:** All four outreach channels ready with BTL management messaging. First batch of 20-30 high-scored BTL leads contacted through at least one channel.

**Requirements:** OUT-BTL-01, OUT-BTL-02, OUT-BTL-03, OUT-BTL-04

**Success Criteria:**
1. Direct mail letter template ready — professional letter pitching BTL management (10% fee, compliance handling, tenant management). EPC compliance as primary hook. Sendable via Stannp API.
2. Email sequences loaded in Instantly.ai — cold email to Ltd/LLP landlords ONLY. Warmed sending domain ready. EPC compliance hook as opener.
3. Phone script exists — pain points (compliance burden, void costs, tenant hassle), service overview (10% fee, what's included), consultation booking flow
4. LinkedIn outreach templates — connection request copy and follow-up DM sequences for landlord profiles identified in enrichment
5. First batch of 20-30 BTL leads contacted through at least one channel, tracked in HubSpot

**Tool setup pause:** Before execution, configure Stannp API for direct mail. Finalise Instantly.ai sequences. Prepare phone scripts and LinkedIn templates.

---

## Phase 6: R2R Pipeline (HMO Landlords Only)

**Goal:** Separate R2R/Guaranteed Rent collateral ready with HMO-specific messaging. First batch of HMO landlord leads contacted with R2R proposition.

**Requirements:** OUT-R2R-01, OUT-R2R-02, OUT-R2R-03, OUT-R2R-04

**Success Criteria:**
1. R2R direct mail template pitches guaranteed rent specifically to HMO landlords — fixed monthly income, zero voids, zero maintenance hassle, 3-10 year commercial lease
2. R2R email sequences target HMO Ltd/LLP landlords with separate messaging — distinct from BTL management pitch
3. R2R phone script covers guaranteed income proposition, commercial lease terms, property inspection process, and next steps
4. Due diligence checklist exists — property inspection requirements, yield analysis template, area demand assessment, minimum criteria before offering guaranteed rent
5. First batch of R2R leads (filtered to HMO landlords only from scored database) contacted through at least one channel

**Tool setup pause:** Before execution, prepare R2R-specific collateral. Review HMO landlord subset from database. Prepare due diligence templates.

---

## Phase Dependencies

```
Phase 1 ──> Phase 2 ──> Phase 3 ──> Phase 4 ──> Phase 5 ──> Phase 6
(Data)      (Sources)    (Score/CRM)  (Compliance)  (BTL)       (R2R)
                                      |
                                      └─ Email warmup starts (3-4 weeks)
                                         Must complete before Phase 5 email
```

## Requirement Coverage

All 28 v1 requirements mapped. No orphans.

| Phase | Requirements | Count |
|-------|-------------|-------|
| 1 | INFRA-01, INFRA-02, INFRA-03, INFRA-04 | 4 |
| 2 | DATA-01, DATA-02, DATA-03, DATA-04, INTEL-01 | 5 |
| 3 | INTEL-02, INTEL-03, INTEL-04, INTEL-05, CRM-01, CRM-02, CRM-03 | 7 |
| 4 | COMP-01, COMP-02, COMP-03, COMP-04 | 4 |
| 5 | OUT-BTL-01, OUT-BTL-02, OUT-BTL-03, OUT-BTL-04 | 4 |
| 6 | OUT-R2R-01, OUT-R2R-02, OUT-R2R-03, OUT-R2R-04 | 4 |
| **Total** | | **28** |

---
*Roadmap created: 2026-03-28*
*Last updated: 2026-03-28 after 02-03 execution complete (3/3 plans done — Phase 2 complete)*
