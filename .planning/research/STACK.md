# Technology Stack

**Project:** SJB Property Management — Landlord Lead Generation Pipeline
**Researched:** 2026-03-28

## Recommended Stack

### Data Scraping & Collection

| Technology | Version/Tier | Purpose | Why | Claude Code Compatible | Confidence |
|------------|-------------|---------|-----|----------------------|------------|
| **Apify** (MCP) | Free ($5/mo credits) + Starter ($49/mo) | Rightmove, Zoopla, OpenRent scraping | Pre-built Actors exist for all three portals. No need to build custom scrapers. Rightmove Actor does 1000 results for $1. Already available as Claude Code MCP server. | YES — native MCP server | HIGH |
| **EPC Open Data API** | Free | EPC register data extraction | Free government API, 30M+ certificates. Searchable by postcode, returns landlord names, property details, EPC ratings, tenure type. Monthly updates. | YES — REST API via Bash/curl | HIGH |
| **Companies House API** | Free (600 req/5 min) | SPV landlord identification | Completely free, no limits on data access. Dedicated MCP server exists (`companies-house-mcp-server` npm package). Search by postcode, SIC code, officer name. | YES — dedicated MCP server | HIGH |
| **HM Land Registry** | Free (Price Paid Data) | Property ownership, transaction history | Free bulk CSV downloads updated monthly. Price Paid Data covers all transactions. Title register individual lookups cost £7 each — use selectively for high-value leads only. | YES — CSV download + API via Bash | MEDIUM |
| **Playwright** (MCP) | Free (open source) | Council HMO registers, custom scraping | Microsoft's official MCP server for Claude Code. Required for council websites with inconsistent formats (PDFs, dynamic pages). Fallback for any site without an Apify Actor. | YES — native MCP server | HIGH |
| **Bright Data** (MCP) | Free (5K req/mo) | Supplementary scraping, anti-bot bypass | Free tier covers search + scrape-as-markdown. Useful backup when Apify Actors fail or for ad-hoc page scraping. No credit card required. | YES — native MCP server | MEDIUM |

### CRM

| Technology | Version/Tier | Purpose | Why | Confidence |
|------------|-------------|---------|-----|------------|
| **HubSpot CRM** | Free tier | Lead tracking, pipeline management, contact storage | Free for up to 1,000 contacts and 2 users — sufficient for initial 50-100 lead target. Deal pipeline, contact management, email integration included. API access on free tier for programmatic lead import. Upgrade to Starter (£18/user/mo) only when automation needed. | HIGH |

**Why not Folk CRM:** No free tier (starts at $30/user/mo), no API access, email sequences only on Premium ($60/user/mo). Over budget for what it offers.

**Why not Capsule CRM:** Decent free tier (250 contacts) but smaller contact limit than HubSpot and weaker API.

**Why not specialist property CRMs (Arthur, Landlord Vision):** These are for managing tenancies, not lead generation pipelines. Wrong tool for this job. Consider later for actual property management operations.

### Outreach Automation

| Technology | Version/Tier | Purpose | Why | Confidence |
|------------|-------------|---------|-----|------------|
| **Instantly.ai** | Growth ($37.60/mo annual) | Cold email sequences | Best value cold email tool. 5,000 emails/mo, unlimited email accounts, built-in warmup. GDPR-compliant with unsubscribe management. Semi-automated review before sending fits the project's requirements. | HIGH |
| **Stannp** | Pay-as-you-go (~£0.55-0.85/letter) | Direct mail / letter campaigns | UK-based, API-driven direct mail. Send personalised letters to landlord addresses scraped from Land Registry/EPC data. Zapier/API integration with HubSpot. No monthly commitment — pay per letter. | MEDIUM |
| **LinkedIn (manual)** | Free / Sales Navigator (£69/mo) | LinkedIn outreach to SPV landlords | Manual approach initially. Sales Navigator only if pipeline justifies it. Target Companies House officers who are also on LinkedIn. | LOW |

**Why not Lemlist:** Starts at similar price but Instantly has better email account flexibility and warmup. Lemlist's strength is multichannel (LinkedIn + email) but that's overkill at this stage.

**Why not Saleshandy:** Comparable to Instantly but less established reputation for deliverability.

### Data Enrichment

| Technology | Version/Tier | Purpose | Why | Confidence |
|------------|-------------|---------|-----|------------|
| **EPC Register cross-referencing** | Free | Landlord names from property addresses | The EPC register contains landlord/owner names and addresses for almost all rental properties. Cross-reference with scraped property data to identify owner names. | HIGH |
| **Companies House cross-referencing** | Free | Director details for SPV landlords | Company officers include names, addresses, date of birth month/year. Cross-reference company address with property addresses to identify landlord directors. | HIGH |
| **Land Registry title lookups** | £7 per title | Definitive ownership confirmation | Use selectively — confirm ownership for top-scored leads only. Returns registered owner name and address. Budget for ~20-30 lookups/month (£140-210). | HIGH |
| **192.com / Tracesmart** | ~£30-50/mo | Phone numbers, email enrichment | UK-specific person search. Find phone numbers and email addresses from names + addresses obtained from EPC/Companies House. Better for UK data than US-focused tools like Apollo/ZoomInfo. | MEDIUM |

**Why not Apollo/ZoomInfo/Cognism:** These are B2B sales tools focused on company employees. Landlords are individuals or small SPVs — these tools have poor coverage for this use case. Expensive and wrong market.

### Infrastructure & Orchestration

| Technology | Version/Tier | Purpose | Why | Confidence |
|------------|-------------|---------|-----|------------|
| **Claude Code** | Existing | Orchestration, data processing, script writing | Already in use. Coordinates MCP servers, writes processing scripts, analyses data, generates outreach content. The brain of the operation. | HIGH |
| **Node.js scripts** | Free | Data processing, API calls, CSV manipulation | Claude Code writes and runs these natively. Process scraped data, call APIs, merge datasets, generate lead scores. | HIGH |
| **SQLite** | Free | Local lead database | Lightweight, file-based. Store scraped leads, enrichment data, scores, outreach status. Claude Code can query directly. No server needed. | HIGH |
| **GitHub** | Free (existing repo) | Version control for scripts and data pipelines | Already set up. Store scraping scripts, scoring algorithms, outreach templates. | HIGH |

**Why not PostgreSQL/MySQL:** Overkill for this volume. SQLite handles thousands of leads without a server. Upgrade only if pipeline grows beyond 10K+ leads.

**Why not Airtable:** Tempting as a "CRM + database" hybrid, but duplicates HubSpot's role and adds cost. Use HubSpot for CRM, SQLite for data processing.

## MCP Server Setup Summary

These MCP servers should be configured in Claude Code:

```bash
# 1. Apify MCP — property portal scraping (already installed based on system context)
# Verify with: claude mcp list

# 2. Playwright MCP — browser automation for council sites
claude mcp add playwright -- npx @playwright/mcp@latest

# 3. Companies House MCP — SPV landlord lookup
claude mcp add companies-house -- npx companies-house-mcp-server
# Requires: COMPANIES_HOUSE_API_KEY env var (free from developer.company-information.service.gov.uk)

# 4. Bright Data MCP — supplementary scraping (free tier)
# Setup via: https://mcp.brightdata.com with API token

# 5. Firecrawl MCP — structured web scraping (500 free credits)
claude mcp add firecrawl -- npx -y firecrawl-mcp
# Requires: FIRECRAWL_API_KEY env var
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Property scraping | Apify Actors | Custom Playwright scripts | Pre-built Actors are maintained, handle anti-bot, cost pennies. Building custom scrapers wastes time. |
| CRM | HubSpot Free | Folk CRM | Folk has no free tier, no API, email sequences locked behind $60/mo Premium plan. |
| Cold email | Instantly.ai | Lemlist | Instantly has better value at Growth tier, unlimited accounts + warmup included. |
| Data enrichment | EPC + CH + 192.com | Apollo/ZoomInfo | US-focused B2B tools with poor UK landlord coverage. EPC + Companies House are free and purpose-built. |
| Database | SQLite | Airtable/Postgres | SQLite is free, file-based, no server. Perfect for <10K records processed locally. |
| Direct mail | Stannp | PostGrid | Stannp is UK-based with UK postal integration. PostGrid is US-focused. |
| Browser automation | Playwright MCP | Puppeteer MCP | Playwright is Microsoft-backed, official MCP server, better cross-browser support. |

## Monthly Cost Estimate

| Tool | Monthly Cost | Notes |
|------|-------------|-------|
| Apify Starter | £40 (~$49) | Covers all property portal scraping. Free tier ($5) may suffice initially. |
| Instantly.ai Growth | £31 (~$37.60) | Annual billing. Cold email sequences. |
| Stannp direct mail | £25-50 (variable) | ~50 letters/month at £0.55-0.85 each |
| 192.com / enrichment | £30-50 | Phone/email lookups |
| Land Registry lookups | £50-140 | 7-20 title searches at £7 each |
| **Total** | **£176-311/mo** | Within £200/mo budget if conservative on Land Registry lookups |

**Cost optimisation:** Start with Apify free tier ($5/mo) and EPC/Companies House (free). Only add Instantly and Stannp when leads are scored and ready for outreach. This phases spend across milestones rather than upfront.

## Installation

```bash
# Core Node.js dependencies (for data processing scripts)
npm install better-sqlite3 csv-parse csv-stringify node-fetch

# Dev dependencies
npm install -D typescript @types/node @types/better-sqlite3

# MCP servers (installed via claude mcp add, not npm install)
# See MCP Server Setup Summary above

# API keys needed (all free to obtain):
# - Companies House: https://developer.company-information.service.gov.uk/
# - EPC Register: https://epc.opendatacommunities.org/ (register for API access)
# - Apify: https://apify.com/ (sign up, get API token)
# - Bright Data: https://brightdata.com/ (sign up for free MCP tier)
# - Firecrawl: https://firecrawl.dev/ (sign up, get API key)
```

## Sources

- [Apify Rightmove Scraper](https://apify.com/automation-lab/rightmove-scraper) — Rightmove Actor details and pricing
- [Apify Zoopla Scraper](https://apify.com/dhrumil/zoopla-scraper) — Zoopla Actor details
- [Apify OpenRent Scraper](https://apify.com/lexis-solutions/openrent-co-uk-scraper) — OpenRent Actor
- [Apify MCP Server](https://docs.apify.com/platform/integrations/mcp) — MCP integration docs
- [EPC Open Data](https://epc.opendatacommunities.org/) — EPC register and API access
- [EPC API Catalogue](https://www.api.gov.uk/mhclg/energy-performance-certificates-domestic-buildings-search-api/) — Official API documentation
- [Companies House API](https://developer.company-information.service.gov.uk/) — Free API access
- [Companies House MCP](https://github.com/stefanoamorelli/companies-house-mcp) — MCP server for Claude Code
- [HM Land Registry Open Data](https://landregistry.data.gov.uk/) — Price Paid Data downloads
- [HM Land Registry APIs](https://www.api.gov.uk/hmlr/) — API catalogue
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) — Official Microsoft MCP server
- [Bright Data MCP Free Tier](https://brightdata.com/pricing/mcp-server) — Pricing and free tier details
- [Firecrawl MCP](https://docs.firecrawl.dev/mcp-server) — Setup documentation
- [HubSpot CRM Free](https://zeeg.me/en/blog/post/hubspot-free) — Free tier features and limitations
- [Instantly.ai Pricing](https://instantly.ai/pricing) — Current pricing plans
- [Stannp UK](https://www.stannp.com/uk) — UK direct mail platform
- [Apify Free Tier](https://use-apify.com/docs/what-is-apify/apify-free-plan) — Free plan details
