# Research Summary: SJB Property Management — Landlord Lead Generation Pipeline

**Domain:** UK Property Management Lead Generation (Stockport & South Manchester)
**Researched:** 2026-03-28
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

The technology ecosystem for UK landlord lead generation is surprisingly well-served by free government APIs and affordable scraping tools. The EPC Open Data API (free, 30M+ certificates), Companies House API (free, 600 req/5 min), and HM Land Registry open datasets (free bulk downloads) form a solid foundation that requires zero monthly spend. For property portal data (Rightmove, Zoopla, OpenRent), Apify provides pre-built scraping Actors with a free tier ($5/mo credits) and native Claude Code MCP integration -- though Rightmove and Zoopla explicitly prohibit scraping in their terms of service, which is a critical legal risk flagged in PITFALLS.md.

The Claude Code MCP ecosystem is mature enough to handle this entire pipeline. Apify MCP (already installed), Playwright MCP (browser automation for council sites), Companies House MCP (dedicated npm package), and Bright Data MCP (5K free requests/month) give Claude Code direct access to all major data sources. The architecture is deliberately local-first: SQLite for data storage, Node.js scripts for processing, Claude Code for orchestration. No cloud infrastructure, no containers, no over-engineering.

The most critical pitfall identified is PECR compliance: UK privacy regulations classify sole trader landlords as "individual subscribers" who cannot be cold-emailed without consent. Only landlords operating through limited companies or LLPs can receive unsolicited electronic marketing. This means the pipeline MUST classify every lead by entity type (using Companies House data) before any email outreach. Direct mail and phone calls are safer channels for sole trader landlords.

Budget-wise, the pipeline can operate within the 50-200 pounds/month constraint. The minimum viable stack costs approximately 70 pounds/month (Apify free tier + Instantly.ai Growth + selective Land Registry lookups), scaling to 175 pounds/month when adding Stannp direct mail and 192.com enrichment.

## Key Findings

**Stack:** Free government APIs (EPC, Companies House, Land Registry) + Apify MCP for portal scraping + SQLite for storage + HubSpot free CRM + Instantly.ai for email outreach + Stannp for direct mail. All orchestrated through Claude Code with MCP servers.

**Architecture:** Local-first data pipeline with five stages: Scrape, Deduplicate, Enrich, Score, Outreach. SQLite as central store, Claude Code as orchestrator, external services only for scraping (Apify) and outreach (Instantly, Stannp).

**Critical pitfall:** PECR compliance -- sole trader landlords cannot be cold-emailed. Must classify every lead by legal entity type before email outreach. This is the single most important architectural decision: entity type must be a first-class field in the data model from day one.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Phase 1: Data Infrastructure** - Set up MCP servers, database schema, EPC + Companies House scraping
   - Addresses: Multi-source scraping, entity type classification, basic lead storage
   - Avoids: PECR violation (entity type from day one), EPC API transition risk (cache locally)
   - Rationale: Free data sources first. Establishes the data foundation everything else depends on.

2. **Phase 2: Portal Scraping + Enrichment** - Add Rightmove/Zoopla/OpenRent data, cross-source deduplication, contact enrichment
   - Addresses: Tired landlord signal detection, portfolio mapping, contact details
   - Avoids: Scraping ToS violation (use Apify Actors or manual research for RM/Zoopla), Land Registry cost spiralling (selective use only)
   - Rationale: Portal data adds the "tired landlord" signals that government data lacks.

3. **Phase 3: Lead Scoring + CRM** - Build scoring algorithm, set up HubSpot pipeline, import scored leads
   - Addresses: Lead prioritisation, BTL vs R2R classification, pipeline visibility
   - Avoids: Scoring bias toward data-rich records (normalise weights), HubSpot contact limit (import only scored leads)
   - Rationale: Scoring before outreach ensures highest-value leads are contacted first.

4. **Phase 4: Outreach Infrastructure** - Set up separate email domain, warm it, configure Instantly.ai, create Stannp templates
   - Addresses: Email sequences, direct mail, phone scripts, GDPR compliance documentation
   - Avoids: Email deliverability collapse (separate domain, warmup period), GDPR non-compliance (LIA, privacy notices, suppression list)
   - Rationale: 3-4 week email warmup period means this must start before outreach launch but after data/scoring is ready.

5. **Phase 5: First Campaign** - Send first batch (20-30 leads), measure response rates, iterate
   - Addresses: Actual outreach, response tracking, pipeline conversion
   - Avoids: Over-automation (manual approval queue), stale data (re-verify before sending)

6. **Phase 6: Onboarding Process** - Compliance checklist, management agreements, local operations setup
   - Addresses: Client onboarding, compliance gates, local contractor network
   - Avoids: Non-compliant property onboarding, remote operation blindspots

**Phase ordering rationale:**
- Free government APIs first (Phase 1) because they provide the richest data at zero cost and establish entity type classification needed for PECR compliance
- Portal scraping second (Phase 2) because it adds tired landlord signals but carries legal risk that should be approached carefully
- Scoring before outreach (Phase 3 before 4) because sending to unscored leads wastes outreach budget
- Email warmup takes 3-4 weeks (Phase 4) -- this is a hard dependency before any email campaigns can launch
- Onboarding process (Phase 6) can be built in parallel with outreach since first conversions will take weeks

**Research flags for phases:**
- Phase 1: EPC API may change by end of March 2026 -- needs monitoring and fallback
- Phase 2: Rightmove/Zoopla scraping has ToS risk -- may need to use manual research instead of automated scraping. Needs legal assessment.
- Phase 4: PECR compliance for sole trader landlords needs careful implementation -- consider legal review of LIA documentation
- Phase 6: Renters' Rights Act (1 May 2026) changes tenancy structures -- all templates must be compliant

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Government APIs are well-documented and verified. Apify/Playwright MCP servers are confirmed working. Pricing verified from official sources. |
| Features | HIGH | Feature landscape is clear -- table stakes vs differentiators well-defined by project requirements. |
| Architecture | MEDIUM-HIGH | Local-first SQLite approach is sound for this scale. Untested is the cross-source deduplication complexity -- may need iteration. |
| Pitfalls | HIGH | PECR/GDPR pitfalls verified against ICO guidance. Rightmove/Zoopla ToS verified. Land Registry pricing confirmed. Renters' Rights Act timing confirmed. |
| Outreach tools | MEDIUM | Instantly.ai pricing confirmed but effectiveness for UK property cold email is unverified -- LOW confidence on response rate assumptions. |
| Data enrichment | MEDIUM | 192.com/Tracesmart for UK person search is well-known but coverage rate for landlord-specific lookups is unverified. |

## Gaps to Address

- **Rightmove/Zoopla scraping legality:** Need a definitive decision on whether to use Apify Actors (technically ToS violation) or manual research. This is an architectural fork that affects Phase 2 scope significantly.
- **192.com/Tracesmart effectiveness:** No verified data on what percentage of landlord names can be enriched with phone/email through these services. May need to test with a small batch first.
- **Council HMO register access:** Stockport Council's register format is unconfirmed. May need FOI request. Manchester City Council has a public register but format needs checking.
- **EPC API post-transition:** The March 2026 transition may affect API access. Monitor and have fallback ready.
- **Cold email response rates for UK property:** No reliable data on what response rates to expect for cold email to UK landlords. Industry benchmarks (1-5% for cold B2B) may not apply.
- **HubSpot free tier API access:** Specific API limitations on free tier need verification before building automated CRM sync.

## Sources

All sources are documented in individual research files:
- [STACK.md](./STACK.md) -- Technology recommendations with pricing and rationale
- [FEATURES.md](./FEATURES.md) -- Feature landscape and MVP recommendation
- [ARCHITECTURE.md](./ARCHITECTURE.md) -- System design and data flow
- [PITFALLS.md](./PITFALLS.md) -- Comprehensive domain pitfalls with prevention strategies
