# Requirements: SJB Property Management Launch — Landlord Lead Generation

**Defined:** 2026-03-28
**Core Value:** Build a reliable, repeatable pipeline that identifies tired landlords and converts them into long-term property management clients — BTL management first, then R2R for HMO landlords only.

## v1 Requirements

Requirements for initial launch. Each maps to roadmap phases.

### Data Infrastructure

- [ ] **INFRA-01**: SQLite database with landlord, property, and lead entities including entity type classification (Ltd/LLP vs sole trader), source provenance, and UPRN linkage
- [ ] **INFRA-02**: MCP server setup — Apify, Playwright, Companies House MCPs installed and configured for Claude Code orchestration
- [ ] **INFRA-03**: EPC Register API scraper — extract rental properties in SK, M14, M19, M20, M21, M22 postcodes with landlord names, addresses, EPC ratings, tenure type
- [ ] **INFRA-04**: Companies House API integration — identify SPV landlords, director details, registered addresses, classify entity type (Ltd/LLP vs sole trader/individual)

### Data Sources

- [ ] **DATA-01**: Land Registry CCOD bulk download — extract all corporate-owned property titles in target postcodes (free CSV)
- [ ] **DATA-02**: OpenRent scraper — identify self-managing landlords listing in target areas (void periods, listing quality)
- [ ] **DATA-03**: Council HMO licensing registers — submit FOI requests to Stockport and Manchester councils; import existing dated register as baseline
- [ ] **DATA-04**: Rightmove/Zoopla scraper — extract listing data for void period analysis and listing quality scoring (noting ToS risk — Apify Actors or manual research as fallback)

### Lead Intelligence

- [ ] **INTEL-01**: Cross-source deduplication — match landlord records across all 5+ data sources using name fuzzy matching, address normalisation, UPRN, and company number
- [ ] **INTEL-02**: Tired landlord scoring algorithm (0-100) — weighted signals: void periods (30+ days), poor listing quality, compliance gaps (EPC rating, expired certificates), multi-property ownership
- [ ] **INTEL-03**: BTL Management lead classification — score for fee-based management suitability: self-managing landlords with 1-5 properties showing overwhelm signals (compliance stress, long voids, poor listings)
- [ ] **INTEL-04**: R2R/Guaranteed Rent lead classification — filter EXCLUSIVELY on HMO landlords: licensed HMO properties where landlord would benefit from fixed income, zero-hassle commercial lease. R2R only works with HMOs.
- [ ] **INTEL-05**: Contact enrichment — find phone numbers and email addresses from property/company data using 192.com, LinkedIn director lookups, Companies House registered addresses

### CRM & Pipeline

- [ ] **CRM-01**: HubSpot free tier CRM setup — pipeline stages: New Lead → Contacted → Consultation Booked → Proposal Sent → Signed → Onboarding
- [ ] **CRM-02**: Import scored leads into HubSpot with all enriched data, source provenance, tired landlord score, and BTL/R2R classification
- [ ] **CRM-03**: Follow-up reminders and task automation — ensure no lead falls through cracks

### Outreach — BTL Management

- [ ] **OUT-BTL-01**: Direct mail templates — professional letter to property address pitching BTL management services (10% fee, compliance handling, tenant management)
- [ ] **OUT-BTL-02**: Email sequences via Instantly.ai — cold email to Ltd/LLP landlords ONLY (PECR compliant), separate sending domain with 3-4 week warmup
- [ ] **OUT-BTL-03**: Phone scripts — prepared BTL management conversation script: pain points, service overview, consultation booking
- [ ] **OUT-BTL-04**: LinkedIn/social outreach — connection request templates and DM sequences for landlord profiles

### Outreach — Guaranteed Rent (R2R)

- [ ] **OUT-R2R-01**: Direct mail templates — professional letter to HMO landlords pitching guaranteed rent (fixed income, no voids, no hassle, 3-10yr commercial lease)
- [ ] **OUT-R2R-02**: Email sequences for HMO Ltd/LLP landlords — separate R2R-specific messaging (PECR compliant)
- [ ] **OUT-R2R-03**: Phone scripts — R2R conversation script: guaranteed income, commercial lease terms, property inspection process
- [ ] **OUT-R2R-04**: R2R due diligence checklist — property inspection, yield analysis, area demand assessment before offering guaranteed rent

### Compliance & Legal

- [ ] **COMP-01**: GDPR Legitimate Interest Assessment (LIA) documentation for B2B landlord marketing
- [ ] **COMP-02**: PECR compliance enforcement — entity type gate: email outreach ONLY to Ltd/LLP landlords; sole traders receive direct mail/phone only
- [ ] **COMP-03**: Privacy notice and data retention policy for landlord lead data
- [ ] **COMP-04**: Suppression list — opt-out tracking to prevent re-contacting landlords who decline

## v2 Requirements

Deferred to after first campaign results are in.

### Automation & Scale

- **AUTO-01**: Automated re-scraping on schedule (weekly/monthly data refresh)
- **AUTO-02**: Lead scoring model refinement based on actual conversion data
- **AUTO-03**: Automated CRM sync (SQLite → HubSpot via API)
- **AUTO-04**: Campaign A/B testing framework

### Onboarding & Operations

- **OPS-01**: Digital management agreement templates (BTL and R2R)
- **OPS-02**: Property inspection workflow and report generation
- **OPS-03**: Local contractor network database
- **OPS-04**: Tenant communication portal

### Reporting

- **RPT-01**: Campaign performance dashboard (response rates, conversion rates, cost per lead)
- **RPT-02**: Pipeline health reporting (leads by stage, velocity, win rate)

## Out of Scope

| Feature | Reason |
|---------|--------|
| R2R for BTL properties | R2R model only works with HMOs — multi-tenant income covers voids and margins |
| National expansion | Stockport + South Manchester only for this launch |
| Fully automated outreach | Semi-automated — manual review before any contact is sent |
| Property sourcing launch | Separate business arm, launching post deal #8 |
| Education/training content | Future arm, not until track record is bulletproof |
| Mobile app | Web/CLI tools sufficient for one-person remote operation |
| Rightmove/Zoopla direct API access | No official API available — scraping via Apify or manual research only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| INTEL-01 | Phase 2 | Pending |
| INTEL-02 | Phase 3 | Pending |
| INTEL-03 | Phase 3 | Pending |
| INTEL-04 | Phase 3 | Pending |
| INTEL-05 | Phase 3 | Pending |
| CRM-01 | Phase 3 | Pending |
| CRM-02 | Phase 3 | Pending |
| CRM-03 | Phase 3 | Pending |
| OUT-BTL-01 | Phase 5 | Pending |
| OUT-BTL-02 | Phase 5 | Pending |
| OUT-BTL-03 | Phase 5 | Pending |
| OUT-BTL-04 | Phase 5 | Pending |
| OUT-R2R-01 | Phase 6 | Pending |
| OUT-R2R-02 | Phase 6 | Pending |
| OUT-R2R-03 | Phase 6 | Pending |
| OUT-R2R-04 | Phase 6 | Pending |
| COMP-01 | Phase 4 | Pending |
| COMP-02 | Phase 4 | Pending |
| COMP-03 | Phase 4 | Pending |
| COMP-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation*
