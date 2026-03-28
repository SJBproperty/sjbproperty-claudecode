# SJB Property Management Launch — Stockport & South Manchester

## What This Is

A structured launch plan for SJB Property Group's property management business across Stockport and South Manchester. Starting from zero external clients, this project builds a semi-automated lead generation pipeline to identify tired landlords, enrich and score them, then execute multi-channel outreach to convert them into management clients. The business has two distinct arms that must remain separate throughout: fee-based BTL/HMO management and commercial guaranteed rent (rent-to-rent) agreements.

## Core Value

Build a reliable, repeatable pipeline that identifies landlords who are struggling with self-management and converts them into long-term property management clients — starting with fee-based BTL management, then layering in guaranteed rent agreements.

## Requirements

### Validated

- [x] Scrape landlord data from EPC Register (D-G rated rentals, cursor pagination, UPRN dedup) — Validated in Phase 01: Data Foundation
- [x] Scrape landlord data from Companies House (SPV identification by SIC code, entity classification, director lookup) — Validated in Phase 01: Data Foundation
- [x] SQLite database with landlord/property entities, source provenance, and entity type classification — Validated in Phase 01: Data Foundation
- [x] MCP tooling configured (Apify, Companies House) for Claude Code orchestration — Validated in Phase 01: Data Foundation
- [x] Scrape and compile landlord data from 5 sources: CCOD, HMO registers, OpenRent, Rightmove/Zoopla, EPC Register — Validated in Phase 02: Data Sources & Deduplication
- [x] Deduplicate landlord records into unified profiles with source provenance — Validated in Phase 02: Data Sources & Deduplication

### Active

- [ ] Detect tired landlord signals: long void periods (30+ days), poor listing quality, compliance red flags (EPC/gas safety/EICR gaps), multi-property ownership
- [ ] Enrich leads with contact details, property portfolio size, and compliance status
- [ ] Score leads by likelihood of needing management services (BTL management vs R2R suitability)
- [ ] Set up CRM to track landlord leads through pipeline stages
- [ ] Build multi-channel outreach system: direct mail templates, email sequences, phone scripts, LinkedIn/social outreach
- [ ] Create separate value propositions and collateral for BTL Management (10% fee) vs Guaranteed Rent (3-10yr commercial lease)
- [ ] Establish onboarding process for new PM clients (inspection → proposal → agreement → handover)
- [ ] At each phase, identify and configure optimal Claude Code compatible tools, MCPs, skills, and CLIs

### Out of Scope

- Education & training arm — future, not until track record is bulletproof
- Property sourcing launch — pipeline, launching post deal #8
- End-to-end investment service — pipeline, not this project
- National expansion — Stockport + South Manchester only for now
- Fully automated outreach — semi-automated with manual review before contact

## Context

**Business backdrop:**
- SJB Property Group, founded 2019 by Sam Bradbury (UK citizen based in Abu Dhabi)
- 7 properties (5 BTL, 2 HMO), portfolio value ~£1,735,000
- Property management arm is live but early stage — zero external clients
- Existing services defined: Professional PM (10% gross rent), Guaranteed Rent (3-10yr), Tenant-Find (65% first month), Refurb PM (15% project cost)
- Remote operation from Abu Dhabi — tools and automation are critical

**Target geography:**
- Stockport borough: SK postcode areas (Stockport, Cheadle, Marple, Bramhall, Hazel Grove, Reddish, Heaton Moor)
- South Manchester: M14 (Fallowfield/Rusholme), M19 (Levenshulme), M20 (Didsbury), M21 (Chorlton), M22 (Wythenshawe/Northenden)

**Two distinct arms (kept separate throughout):**

1. **BTL/HMO Management (PRIORITY)** — Fee-based model
   - 10% of gross rent for full management
   - Tenant-find at 65% of first month's rent
   - Refurb project management at 15% of project cost
   - Target: landlords with 1-5 properties who are overwhelmed by compliance, voids, tenant issues

2. **Guaranteed Rent / Rent-to-Rent** — Commercial lease model
   - SJB takes 3-10 year commercial lease on property
   - Landlord receives fixed monthly income regardless of occupancy
   - SJB covers all voids, utilities, maintenance, and provides free upgrades
   - Target: landlords who want zero hassle, absentee owners, portfolio landlords wanting certainty
   - Second priority — layer in after BTL management pipeline is flowing

**Data sources for landlord scraping:**
1. Council HMO licensing registers (Stockport Council, Manchester City Council)
2. HM Land Registry (multi-property owners, corporate ownership, absentee landlords)
3. Companies House (SPV landlords, property companies registered in target area)
4. Rightmove/Zoopla/OpenRent (self-managing landlords, long-void properties, poor listings)
5. EPC Register via Open Data Communities (landlord names, property details, EPC ratings, tenure type, compliance gaps)

**Tired landlord signals to detect:**
- Properties listed for 30+ days (void period signal)
- Poor listing quality (bad photos, minimal descriptions, no floorplans)
- Compliance red flags (expired/missing EPC, gas safety, EICR, deposit protection)
- Multi-property owners (3+ properties = more likely to want professional management)
- Low EPC ratings (compliance cost pressure)

**Outreach channels (all four):**
- Direct mail / letters to property address or registered office
- Email campaigns with follow-up sequences
- Phone calls from scraped/enriched contact details
- Social media / LinkedIn DMs and connection requests

**Automation level:** Semi-automated — scrape, enrich, and score automatically; manual review and approval before any outreach is sent.

**Tool requirements:** At each phase, pause to identify and set up the best Claude Code compatible tools, MCPs, skills, CLIs, and connectors. Budget: £50-200/month for paid tools.

## Constraints

- **Geography**: Stockport + South Manchester only (SK, M14, M19, M20, M21, M22 postcodes)
- **Budget**: £50-200/month for tools and subscriptions
- **Timeline**: Scraping infrastructure operational this week
- **Remote operation**: Sam is based in Abu Dhabi — everything must be operable remotely
- **Compliance**: All data scraping must comply with UK GDPR and ICO guidance on legitimate interest for B2B marketing
- **Separation**: BTL Management and Guaranteed Rent must remain as distinct pipelines with separate collateral, scoring, and outreach strategies
- **Existing brand**: All outreach must align with SJB Property Group brand voice — professional, approachable, confident, not arrogant

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BTL management before R2R | Get fee-based management flowing first, R2R requires more capital commitment and risk assessment | — Pending |
| Semi-automated pipeline | Maintain quality control on outreach — manual review before contact | — Pending |
| All 5 data sources | Cross-referencing gives highest quality leads and most complete landlord profiles | — Pending |
| 50-100 high-quality leads target | Focused approach — quality over volume for first campaign | — Pending |
| CRM setup required | No existing CRM — need to establish from scratch as part of this project | — Pending |

---
*Last updated: 2026-03-28 — Phase 02 (Data Sources & Deduplication) complete*
