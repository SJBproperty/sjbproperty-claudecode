# Feature Research: UK Property Management Landlord Lead Generation

**Domain:** Landlord acquisition pipeline for BTL/HMO management and Guaranteed Rent (Rent-to-Rent)
**Researched:** 2026-03-28
**Confidence:** MEDIUM-HIGH (data source capabilities verified against official docs; outreach conversion data from industry benchmarks)

---

## ARM 1: BTL/HMO Fee-Based Management (10% Gross Rent)

### Table Stakes (Pipeline Fails Without These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **EPC Register scraping by postcode** | Core data source -- 104 fields per record including TENURE (identifies rental properties), CURRENT_ENERGY_RATING, PROPERTY_TYPE, LODGEMENT_DATE, ADDRESS, POSTCODE, UPRN. Free API with registration. Filter by postcode prefix (SK, M14, M19, M20, M21, M22) and tenure type "rental" | MEDIUM | API at epc.opendatacommunities.org. Rate limits apply. Returns CSV/JSON. Pagination via `search-after` parameter for unlimited records. TENURE field is the key filter -- identifies rental vs owner-occupied |
| **Companies House SPV landlord identification** | Free API. Search by SIC codes 68100 (buying/selling own real estate), 68209 (other letting/operating own or leased real estate), 68320 (management of real estate). Filter by registered office address in target postcodes. Returns company name, registration number, officers, registered address | MEDIUM | Advanced search endpoint supports SIC code filtering. Cross-reference company registration numbers with CCOD data for property matching |
| **Land Registry CCOD corporate ownership data** | Free bulk CSV download (monthly). Contains title number, property address, tenure, proprietor company name, company registration number, correspondence address, price paid. ~3M rows nationally -- filter by postcode | MEDIUM | Register at use-land-property-data.service.gov.uk. Cross-reference with Companies House for officer/director details. CCOD covers corporate owners only -- individual landlords require per-title paid searches (GBP3 each) |
| **HMO register data acquisition** | Councils legally required to maintain public HMO registers under Housing Act 2004. Format varies wildly -- Stockport and Manchester do NOT offer public downloadable registers. Must use FOI requests (typically returned as Excel/PDF) or scrape council checker tools | HIGH | Submit FOI requests to Stockport MBC and Manchester CC. Response time up to 20 working days. Data typically includes: property address, licence holder name, licence number, licence expiry, max occupants. No standardised format across councils |
| **Lead scoring model** | Without scoring, every landlord looks the same. Must differentiate between "needs management now" vs "may need later" vs "never". Score based on: portfolio size (3+ properties = higher), EPC rating (D-G = compliance pressure), void indicators, distance from property (absentee), corporate vs individual ownership | MEDIUM | Start with simple weighted scoring. Refine with conversion data over time |
| **CRM with pipeline stages** | Track leads from identification through enrichment, scoring, outreach, response, meeting, proposal, signed. Without this, leads fall through cracks and follow-ups get missed | LOW-MEDIUM | Use a lightweight CRM. Pipeline stages: Identified > Enriched > Scored > Outreach Queued > Contacted > Responded > Meeting Booked > Proposal Sent > Won/Lost |
| **Contact enrichment** | Raw data gives property addresses and company names but rarely phone numbers or emails. Must enrich with: LinkedIn profiles, company websites, 192.com/electoral roll lookups, director correspondence addresses from Companies House | HIGH | Most time-consuming step. Companies House gives director home addresses (suppressed for most post-2018 filings -- only correspondence addresses available). Consider paid enrichment services within budget |
| **Manual outreach approval gate** | Semi-automated pipeline with human review before any contact is sent. Prevents embarrassing errors, ensures brand voice compliance, and satisfies GDPR legitimate interest requirements | LOW | Simple approval queue -- flag leads as "ready for outreach" with manual send |
| **Multi-channel outreach templates** | Direct mail (letters to property or registered office), email sequences, phone scripts. Each channel needs templates tailored to BTL management value proposition: compliance burden relief, void reduction, tenant management, remote landlord support | MEDIUM | 7-10 touchpoints needed to convert. First follow-up within 24 hours boosts response 31%. Personalisation doubles response rates |
| **GDPR legitimate interest documentation** | B2B marketing to landlords operating as businesses falls under legitimate interest, but must document the legitimate interest assessment (LIA), provide opt-out mechanism, and maintain suppression lists | LOW | Document LIA once. Include opt-out in every communication. Maintain do-not-contact list |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Listing portal monitoring (Rightmove/Zoopla/OpenRent)** | Detect self-managing landlords (OpenRent = almost exclusively self-managers), long void periods (30+ days listed), poor listing quality (few photos, short descriptions, no floorplan). OpenRent scrapers available on Apify. Rightmove/Zoopla legally risky to scrape directly | HIGH | OpenRent is the priority -- self-managing landlords by definition. Apify actors exist for all three portals. Legal grey area for Rightmove/Zoopla (terms prohibit scraping, Computer Misuse Act 1990 risk). OpenRent is lower risk. Focus on OpenRent first |
| **Cross-source lead enrichment** | Match the same landlord across EPC, CCOD, Companies House, and HMO registers using UPRN (available in EPC data since Nov 2021) and address matching. Landlords appearing in multiple sources = higher confidence, richer profiles | HIGH | UPRN is the golden key for cross-referencing. EPC data includes UPRN. CCOD does not include UPRN but has address. Fuzzy address matching needed |
| **Tired landlord signal detection** | Automated flagging: EPC rating D-G (compliance cost pressure, especially with 2028 EPC C minimum proposals), properties with EPCs >10 years old (may be non-compliant), multiple properties under same owner (portfolio stress), properties in selective licensing areas (extra admin burden) | MEDIUM | Combine EPC data (rating + lodgement date) with CCOD (portfolio size) and council licensing zones. Most signals derivable from existing data without additional scraping |
| **Absentee landlord identification** | CCOD correspondence address vs property address mismatch = absentee owner. Companies House registered office in different city/country = remote landlord. These landlords are prime targets -- they need local management most | MEDIUM | Simple address comparison. Flag when correspondence address is >50 miles from property or in a different country |
| **Compliance gap alerting** | EPC certificates expire after 10 years. Cross-reference EPC lodgement date with current date to flag properties with expired or expiring EPCs. Landlords with compliance gaps face fines up to GBP5,000 per property -- strong outreach angle | LOW-MEDIUM | Straightforward date calculation on EPC data. Strong conversion trigger -- "your EPC at [address] expired [date], penalties are up to GBP5,000" |
| **Renters' Rights Act trigger campaigns** | The Renters' Rights Act 2025 phases in from May 2026: abolishes Section 21, requires open-ended periodic tenancies. Many self-managing landlords will be overwhelmed by new requirements. Time-sensitive outreach opportunity | LOW | Template-based campaign. No scraping needed -- apply to entire lead database. Highly relevant conversion trigger through H2 2026 |
| **Competitive intelligence on local agents** | Monitor what other managing agents in Stockport/South Manchester charge, what services they offer, where they fall short. Use to sharpen positioning | LOW | Manual research exercise. Review Google reviews of competitors for common complaints |

### Anti-Features (Do NOT Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Fully automated outreach (no human review)** | Speed and scale | Brand risk, GDPR compliance risk, embarrassing errors (wrong data, deceased persons, already-managed properties). At 50-100 leads, manual review is feasible | Semi-automated: system queues, human approves and sends |
| **Rightmove/Zoopla direct scraping** | Rich listing data | Legally risky (terms of service violations, Computer Misuse Act 1990). Rightmove actively blocks scrapers. Litigation risk is real | Use OpenRent (lower risk, self-managing landlords by definition). Consider paid data providers if budget allows |
| **Individual Land Registry title searches at scale** | Get individual (non-corporate) landlord names | GBP3 per search, no bulk discount for individuals. 1,000 searches = GBP3,000. Not cost-effective for cold outreach with 1-5% conversion | Focus on corporate landlords (free via CCOD) and HMO register data (free via FOI). Individual landlords found via EPC tenure field + OpenRent monitoring |
| **AI-generated personalised messages** | Hyper-personalisation at scale | Feels robotic, damages trust. Landlords are B2B decision-makers who value authenticity. Generic AI copy is detectable and off-putting | Human-written templates with mail-merge personalisation (name, address, specific compliance issue). 3-5 strong templates > 100 AI-generated ones |
| **National coverage** | Bigger addressable market | Spreads too thin. Management requires local presence, local knowledge, local contractors. "We manage properties in Stockport and South Manchester" is a strength, not a limitation | Stockport + South Manchester only. Expand geography only after pipeline is proven |
| **Real-time property price tracking** | Know property values | Not relevant to management lead gen. Landlords don't care about property values when choosing a managing agent. They care about tenant quality, compliance, and hassle reduction | Focus on rental yield data and void period analysis instead |
| **Tenant-facing features** | Attract tenants to attract landlords | Reverses the acquisition funnel. Build landlord pipeline first. Tenants follow properties, not management companies | Landlord-first strategy. Tenant acquisition comes after landlord signs management agreement |
| **Custom scraper code for portals** | Full control over scraping | Fragile, breaks with site changes, wastes engineering time maintaining anti-bot countermeasures | Use Apify Actors -- maintained by specialists, handle anti-bot measures, pay per use |
| **Real-time dashboard** | Pretty visualisations | Over-engineering for a 50-100 lead pipeline. Time spent building dashboards is time not spent contacting landlords | CSV exports + CRM reports are sufficient until pipeline exceeds 500+ leads |

---

## ARM 2: Guaranteed Rent / Rent-to-Rent (Commercial Lease, 3-10yr)

### Table Stakes (Pipeline Fails Without These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Property financial viability calculator** | Before offering guaranteed rent, must model: market rent vs guaranteed rent (typically 70-85% of market), void risk, maintenance reserve, utility costs, licensing costs, refurb costs. If margins are too thin, the deal destroys value | MEDIUM | Spreadsheet model initially. Inputs: market rent, property condition, EPC rating, HMO potential, local demand. Output: monthly margin, break-even period, total deal value over lease term |
| **Property condition assessment checklist** | Physical inspection before committing to a 3-10 year lease. Must assess: roof, boiler, electrics, plumbing, windows, damp, structural issues. Unexpected maintenance on a guaranteed rent deal eats the margin | MEDIUM | Standardised checklist with cost estimates for each item. Red flags that kill the deal: structural issues, asbestos, Japanese knotweed, subsidence |
| **Legal template: commercial lease agreement** | Not an AST -- a commercial lease between SJB and the landlord. Must include: fixed rent amount, lease duration, break clauses, maintenance responsibilities, permission to sublet, insurance requirements, exit terms | HIGH | Must be drafted by a solicitor. Template created once, customised per deal. Key: clear delineation of landlord vs SJB responsibilities |
| **Compliance and licensing pre-check** | Before taking on an R2R property, verify: current EPC (must be C or above for new lets from 2028), gas safety certificate, EICR, fire safety compliance, HMO licence if applicable, selective licence if in designated area, planning permission for HMO conversion | MEDIUM | Checklist-based. Many items checkable from EPC register and council data before viewing. Some require physical inspection |
| **Separate CRM pipeline for R2R** | Different qualification criteria, longer sales cycle, different collateral. Must not be mixed with BTL management pipeline | LOW | Separate pipeline in same CRM: Identified > Pre-Qualified > Viewed > Financial Model > Proposal > Legal > Signed |
| **Landlord profile qualifying criteria** | R2R suits: absentee/overseas landlords wanting zero hassle, portfolio landlords wanting certainty, landlords tired of voids, landlords with properties in areas of high rental demand but challenging tenant demographics. NOT suited for: landlords who want maximum rent (guaranteed rent is below market), landlords with properties in poor condition, landlords who enjoy managing | LOW | Scoring model separate from BTL management. Weight: distance from property (high), portfolio size (medium), property condition (high), rental demand in area (high) |
| **Redress scheme membership** | Legal requirement since October 2014 -- all agents operating guaranteed rent arrangements must belong to a government-authorised consumer redress scheme (Property Redress Scheme or The Property Ombudsman) | LOW | Apply for membership. One-time setup. Ongoing annual fee (circa GBP150-300). Essential for credibility and legal compliance |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **HMO conversion feasibility assessment** | Identify properties suitable for conversion to HMO under R2R lease. Higher rent per room = better margins. Cross-reference EPC data (number of habitable rooms, total floor area) with council HMO licensing requirements | MEDIUM | Use EPC fields: NUMBER_HABITABLE_ROOMS, TOTAL_FLOOR_AREA, PROPERTY_TYPE. Stockport HMO requirements: minimum room sizes, amenity standards. Conversion adds value for SJB and the landlord |
| **Landlord ROI comparison tool** | Show landlords: "You currently receive GBP800/month self-managing with 2 months void = GBP8,000/year. With our guaranteed rent at GBP750/month, you receive GBP9,000/year with zero hassle, zero voids, free upgrades." Makes the value proposition tangible | LOW-MEDIUM | Simple calculator in proposal documents. Very effective conversion tool when the maths works |
| **Track record evidence pack** | SJB has 7 properties, 100% investor repayment record. Package existing track record into a professional evidence pack for guaranteed rent proposals. Addresses the number one landlord concern: "Will you actually pay the rent?" | LOW | Compile from existing data. Include: portfolio photos, financial track record, testimonials, company registration, redress scheme membership |
| **Free property upgrade offer** | Unique selling point of SJB's guaranteed rent: "We cover all voids, utilities, maintenance, AND provide free upgrades." Document specific upgrades offered (new kitchen, bathroom refresh, redecoration) with estimated values | LOW | Photography and documentation of past upgrades. Include in pitch deck and proposals |
| **Selective licensing area targeting** | Manchester has extensive selective licensing zones. Properties in these areas have extra admin burden on landlords (licence applications, compliance inspections, fees). These landlords are more likely to want management or guaranteed rent | LOW | Map selective licensing areas against lead database. Flag properties in licensed zones as higher priority |

### Anti-Features (Do NOT Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Automated guaranteed rent offers** | Speed | R2R deals require property viewing, financial modelling, and legal review. Automated offers without inspection = financial disaster. One bad deal on a 5-year lease could cost GBP50,000+ | Manual assessment of every R2R opportunity. No exceptions |
| **R2R deals outside target geography** | More deals | Management, maintenance, and tenant issues require local presence. Remote R2R management from Abu Dhabi already stretches the model -- adding unfamiliar areas compounds risk | Stockport + South Manchester only. Expand only with proven local team in new area |
| **R2R deals on properties in poor condition** | Higher margins after refurb | Refurb cost risk on a property you don't own. Landlord may not permit extensive works. If the lease ends, you lose the investment. Maintenance costs on a poorly maintained property are unpredictable | Only take R2R on properties rated "good" or "fair" condition. Factor any essential refurb into the guaranteed rent discount |
| **Guaranteed rent above 85% of market rate** | Win more deals by offering more | Margin compression. After voids, maintenance, utilities, and licensing costs, anything above 80-85% of market rate leaves insufficient margin. One bad month wipes out a year of profit | Cap guaranteed rent at 75-80% of market rate. Be willing to walk away from deals that don't work at this level |

---

## Cross-Cutting Features (Both Arms)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Unified data store** | All landlord data from all sources (EPC, CCOD, Companies House, HMO registers, listing portals) stored in one place, deduplicated by UPRN or address | MEDIUM | Database or structured spreadsheet. UPRN is the primary key where available. Fuzzy address matching for sources without UPRN |
| **Data refresh pipeline** | EPC data updates monthly. CCOD updates monthly. Companies House data is live. HMO registers update quarterly (via FOI refresh). Stale data = stale leads | MEDIUM | Monthly batch refresh for EPC and CCOD. Quarterly FOI requests for HMO data. Weekly OpenRent monitoring for new/changed listings |
| **Outreach suppression list** | Track who has been contacted, who opted out, who said no. Never contact the same person twice within 90 days. Never contact someone who opted out. GDPR requirement | LOW | Maintained in CRM. Checked before any outreach is approved |
| **Activity logging and reporting** | Track: leads generated per source, outreach sent, response rates, meetings booked, deals closed. Without metrics, cannot optimise the pipeline | LOW | Weekly report. Key metrics: leads added, outreach sent, response rate (target >4%), meetings booked, conversion rate |
| **Brand-consistent collateral** | Professional letterheads, email templates, proposal documents, pitch decks. Must align with SJB brand voice: professional, approachable, confident, not arrogant | MEDIUM | Design templates once. Separate collateral packs for BTL Management vs Guaranteed Rent. Include company credentials, track record, service descriptions |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Postcode-level market intelligence** | For each target postcode: average rent by property type, void rates, tenant demand indicators, licensing requirements, EPC distribution. Used in outreach: "In SK5, average void periods are X weeks. We reduce that to Y" | MEDIUM | Derivable from EPC data (property counts, rating distribution) and listing portal data (time-on-market). Powerful in personalised outreach |
| **Landlord portfolio mapping** | When CCOD reveals a company owning 5 properties in your area, that is a 5x opportunity. Map entire portfolios per landlord/company. Pitch management of the entire portfolio, not one property | LOW-MEDIUM | Group CCOD data by company registration number. Count properties per company. Prioritise multi-property owners |
| **Referral programme** | Existing landlord clients refer other landlords. Offer: GBP200 referral fee or 1 month free management. The most powerful lead source once you have happy clients | LOW | Build after first 3-5 clients are onboarded and satisfied. Word of mouth is the highest-converting channel in UK property management |
| **Local networking and events** | Stockport landlord forums, property investor meetups, NRLA local events. Face-to-face relationship building supplements digital outreach | LOW | Sam is in Abu Dhabi -- may need a local representative or attend during UK visits. Consider virtual landlord webinars as alternative |

---

## Data Source Capabilities Summary

### EPC Register (epc.opendatacommunities.org)
- **Access:** Free API, requires registration
- **Key fields for lead gen:** ADDRESS, POSTCODE, UPRN, TENURE (rental vs owner-occupied), CURRENT_ENERGY_RATING, PROPERTY_TYPE, BUILT_FORM, NUMBER_HABITABLE_ROOMS, TOTAL_FLOOR_AREA, LODGEMENT_DATE, TRANSACTION_TYPE, LOCAL_AUTHORITY, CONSTRUCTION_AGE_BAND, MAINS_GAS_FLAG, ENVIRONMENT_IMPACT_CURRENT, CO2_EMISSIONS_CURRENT, HEATING_COST_CURRENT, MAINHEAT_DESCRIPTION, WALLS_DESCRIPTION, ROOF_DESCRIPTION, WINDOWS_DESCRIPTION, FLOOR_LEVEL, FLAT_TOP_STOREY
- **Filters:** Postcode prefix, energy band, property type, local authority, constituency, lodgement date range, floor area category
- **Volume:** ~30M certificates nationally. Filter to target postcodes
- **Update frequency:** Monthly
- **Confidence:** HIGH (verified against official API docs)

### Land Registry CCOD (use-land-property-data.service.gov.uk)
- **Access:** Free bulk CSV download, requires registration and licence acceptance
- **Key fields:** Title number, property address, tenure (freehold/leasehold), proprietor company name (up to 4), company registration number (up to 4), correspondence address, price paid, date of registration, proprietor category, additional proprietor indicator
- **Limitations:** Corporate owners ONLY. Individual landlords not included. No UPRN field. Up to 4 proprietors per title with flag for additional
- **Volume:** ~3M rows nationally. Filter by postcode in property address
- **Update frequency:** Monthly (2nd working day of month). Both complete file and changes-only file available
- **Confidence:** HIGH (verified against official tech spec)

### Companies House API (developer.company-information.service.gov.uk)
- **Access:** Free API, requires API key registration
- **Key capabilities:** Advanced company search by SIC code (68100, 68209, 68320), registered office address search, officer/director lookup with appointment history, company filing history, people of significant control, insolvency data
- **Relevant SIC codes:** 68100 (buying/selling own real estate), 68209 (other letting/operating own or leased real estate), 68320 (management of real estate on a fee or contract basis)
- **Limitations:** Cannot bulk download all companies by SIC code in one call -- must paginate through results. Director home addresses suppressed for post-2018 filings (correspondence address only). Rate limits apply
- **Confidence:** HIGH (official API documentation verified)

### Council HMO Registers (Stockport MBC, Manchester CC)
- **Access:** NOT publicly downloadable for either council. Must use Freedom of Information requests
- **Expected data fields:** Property address, licence holder name, licence number, licence expiry date, maximum occupants
- **Format:** Typically Excel or PDF via FOI response
- **Timeline:** Up to 20 working days for FOI response
- **Alternative:** Kamma (kammadata.com) aggregates national licensing data commercially. PropertyData (propertydata.co.uk) offers national HMO register search
- **Confidence:** MEDIUM (based on FOI request examples from WhatDoTheyKnow)

### Listing Portals (Rightmove, Zoopla, OpenRent)
- **OpenRent:** Best target -- exclusively self-managing landlords. Apify scrapers available. Data includes: address, rent, bedrooms, availability date, landlord preferences, listing duration, deposit, EPC rating. Lower legal risk than Rightmove/Zoopla
- **Rightmove/Zoopla:** No public API. Scraping violates terms of service. Legal risk under Computer Misuse Act 1990. Apify scrapers exist but use at own risk. Rightmove actively blocks scrapers
- **Key signals from listings:** Days on market (>30 = void signal), photo quality/count, description length, floorplan presence, "private landlord" tags
- **Confidence:** MEDIUM (scraping legality uncertain for Rightmove/Zoopla; LOW risk for OpenRent)

---

## Feature Dependencies

```
[EPC Scraping] ──────────────────┐
[CCOD Download] ─────────────────┤
[Companies House API] ───────────┼──> [Unified Data Store] ──> [Lead Scoring] ──> [CRM Pipeline]
[HMO Register FOI] ─────────────┤                                    |
[OpenRent Monitoring] ───────────┘                                    v
                                                              [Contact Enrichment]
                                                                      |
                                                                      v
                                                              [Outreach Templates]
                                                                      |
                                                                      v
                                                              [Manual Approval Gate]
                                                                      |
                                                                      v
                                                              [Multi-Channel Send]
                                                                      |
                                                                      v
                                                              [Response Tracking]

[BTL Management Scoring] ──conflicts──> [R2R Scoring]
(Different criteria, separate pipelines, same data sources)

[R2R Financial Calculator] ──requires──> [Property Viewing/Inspection]
[R2R Legal Template] ──requires──> [Solicitor Engagement]
[Referral Programme] ──requires──> [First 3-5 Happy Clients]
```

### Dependency Notes

- **All data sources require Unified Data Store:** Cannot score or enrich without centralised, deduplicated data
- **Lead Scoring requires enriched data:** Raw scraped data is insufficient -- need cross-referenced profiles
- **Contact Enrichment is the bottleneck:** Most data sources give property addresses but not landlord contact details. This step takes the most manual effort
- **R2R Financial Calculator requires viewing:** Cannot model costs without knowing property condition
- **Referral Programme requires happy clients:** Build only after proving service quality with first clients
- **BTL Management scoring conflicts with R2R scoring:** Same landlord may score differently for each arm. Must run both scoring models and route appropriately

---

## MVP Definition

### Launch With (v1) -- BTL Management Pipeline

- [ ] **EPC Register scraping for target postcodes** -- highest volume, richest data, free, legal
- [ ] **CCOD bulk download and postcode filtering** -- identifies corporate landlords with portfolios, free
- [ ] **Companies House API integration** -- enriches CCOD companies with officer details and SIC codes
- [ ] **Unified data store (SQLite or structured CSV)** -- deduplicate and cross-reference sources
- [ ] **Simple lead scoring (weighted formula)** -- portfolio size, EPC rating, distance, tenure
- [ ] **CRM pipeline setup** -- track leads through stages
- [ ] **BTL Management outreach templates (letter + email)** -- 2-3 templates per channel
- [ ] **Manual approval gate** -- review queue before send
- [ ] **GDPR legitimate interest assessment** -- documented once

### Add After Validation (v1.x)

- [ ] **HMO register data via FOI** -- submit requests to Stockport and Manchester councils once pipeline basics are working
- [ ] **OpenRent monitoring** -- detect self-managing landlords with void signals
- [ ] **Contact enrichment workflow** -- LinkedIn, company websites, 192.com lookups
- [ ] **Phone outreach scripts** -- add after letter/email response data shows which leads are warm
- [ ] **Compliance gap alerting** -- flag expired EPCs as outreach triggers
- [ ] **Renters' Rights Act campaign** -- time-sensitive, launch before May 2026
- [ ] **Direct mail via Stannp API** -- physical letters to landlord addresses (higher response rate than email for property)

### Future Consideration (v2+) -- R2R Pipeline

- [ ] **R2R financial viability calculator** -- build after BTL management pipeline is converting
- [ ] **R2R property assessment checklist** -- standardise the viewing process
- [ ] **Separate R2R CRM pipeline** -- add when pursuing first R2R deal
- [ ] **R2R legal template** -- engage solicitor when first R2R deal is identified
- [ ] **Referral programme** -- launch after 3-5 happy management clients
- [ ] **Portfolio mapping** -- group properties by owner for portfolio-level pitches
- [ ] **Postcode-level market intelligence** -- build as data accumulates

---

## Feature Prioritisation Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| EPC Register scraping | HIGH | MEDIUM | P1 |
| CCOD bulk download + filtering | HIGH | LOW | P1 |
| Companies House API enrichment | HIGH | MEDIUM | P1 |
| Unified data store | HIGH | MEDIUM | P1 |
| Lead scoring model | HIGH | LOW | P1 |
| CRM pipeline | HIGH | LOW | P1 |
| BTL outreach templates | HIGH | LOW | P1 |
| Manual approval gate | MEDIUM | LOW | P1 |
| GDPR documentation | MEDIUM | LOW | P1 |
| HMO register FOI requests | MEDIUM | LOW | P2 |
| OpenRent monitoring | MEDIUM | MEDIUM | P2 |
| Contact enrichment workflow | HIGH | HIGH | P2 |
| Phone scripts | MEDIUM | LOW | P2 |
| Compliance gap alerting | MEDIUM | LOW | P2 |
| Renters' Rights Act campaign | HIGH | LOW | P2 |
| Direct mail (Stannp) | MEDIUM | LOW | P2 |
| R2R financial calculator | HIGH | MEDIUM | P3 |
| R2R property checklist | MEDIUM | LOW | P3 |
| R2R CRM pipeline | MEDIUM | LOW | P3 |
| R2R legal template | HIGH | HIGH (solicitor cost) | P3 |
| Referral programme | HIGH | LOW | P3 |
| Portfolio mapping | MEDIUM | LOW | P3 |

**Priority key:**
- P1: Must have for initial BTL management pipeline launch
- P2: Add once P1 is working and generating leads
- P3: Deferred until BTL management is converting and R2R arm is activated

---

## Competitor and Market Context

| Factor | What We Know | Implication |
|--------|--------------|-------------|
| 93,000 landlords exited UK market in 2025 | Supply of "tired landlords" is growing | More leads available, but also more competition from other agents |
| UK PM revenue approaching GBP38B in 2026 | Large and growing market | Validates the business case |
| Renters' Rights Act phases in from May 2026 | Self-managing landlords face new compliance burden (no Section 21, periodic tenancies only) | Time-sensitive outreach opportunity -- H1 2026 is the window |
| Average cold email conversion: 1-5% | Need 100+ targeted outreach to generate 1-5 clients | Quality over quantity. 50-100 high-quality leads target is appropriate for first campaign |
| 7-10 touchpoints to convert | Single letter/email insufficient | Multi-channel, multi-touch campaigns essential |
| Follow-up within 24 hours boosts response 31% | Speed matters after first contact | CRM alerts for responses. Manual but prompt follow-up |

---

## Tired Landlord Signals (Research-Backed)

### Signals for BTL Management Need
| Signal | Data Source | Strength | Notes |
|--------|------------|----------|-------|
| Property listed 30+ days | OpenRent/portal scraping | STRONG | Void period = lost income. Direct pain point |
| Poor listing quality (few photos, short description) | OpenRent/portal scraping | MEDIUM | Indicates lack of time/care. Self-managing landlord likely overwhelmed |
| EPC rating D-G | EPC Register | MEDIUM | Compliance cost pressure. EPC C minimum coming (proposals for 2028) |
| EPC certificate >10 years old | EPC Register | STRONG | Expired EPC = fine up to GBP5,000. Compliance gap = outreach trigger |
| 3+ properties under same owner | CCOD + Companies House | STRONG | More properties = more admin burden. Portfolio stress increases with scale |
| Correspondence address >50 miles from property | CCOD | STRONG | Absentee landlord. Cannot self-manage effectively from distance |
| Property in selective licensing area | Council data | MEDIUM | Extra admin burden. Licensing fees, compliance inspections |
| SPV company with single director | Companies House | MEDIUM | One-person operation. Likely doing everything themselves |
| Company dissolved/in winding up | Companies House | LOW | May indicate landlord exiting market. Sell or transfer to management |
| Low Google review scores for area agents | Google | LOW | If local agents are poor, opportunity to be the better option |

### Signals for Guaranteed Rent Suitability
| Signal | Data Source | Strength | Notes |
|--------|------------|----------|-------|
| Overseas correspondence address | CCOD | STRONG | Absentee owner. Wants zero hassle. Perfect R2R candidate |
| 5+ properties in target area | CCOD | STRONG | Portfolio landlord. Values certainty and simplicity |
| Property suitable for HMO conversion | EPC (rooms, floor area) | MEDIUM | Higher margins for SJB if HMO conversion viable |
| Property in high-demand rental area | Local knowledge + EPC density | MEDIUM | Lower void risk for SJB = safer guaranteed rent offer |
| Landlord previously used managing agent (listed via agent then relisted privately) | Portal monitoring | MEDIUM | Unhappy with previous agent. Open to alternatives |
| Property vacant 60+ days | Portal monitoring | STRONG | Desperate to fill. Guaranteed rent solves the problem immediately |

---

## Sources

- [EPC Open Data API Documentation](https://epc.opendatacommunities.org/docs/api/domestic) -- verified field list, access methods (HIGH confidence)
- [EPC Open Data Communities](https://epc.opendatacommunities.org/) -- registration and access (HIGH confidence)
- [EPC Data Guidance](https://epc.opendatacommunities.org/docs/guidance) -- field glossary (HIGH confidence)
- [Land Registry CCOD Tech Spec](https://use-land-property-data.service.gov.uk/datasets/ccod/tech-spec) -- dataset fields (HIGH confidence)
- [Land Registry CCOD Dataset](https://use-land-property-data.service.gov.uk/datasets/ccod) -- access and licensing (HIGH confidence)
- [Companies House API](https://developer.company-information.service.gov.uk/) -- capabilities overview (HIGH confidence)
- [Companies House Advanced Search](https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/search/advanced-company-search) -- SIC code filtering (HIGH confidence)
- [Stockport Council HMO FOI Requests](https://www.whatdotheyknow.com/request/a_list_of_licensed_hmo_in_stockp) -- FOI as access method (MEDIUM confidence)
- [Manchester Council HMO Licensing](https://www.manchester.gov.uk/hmolicensing) -- no public register download (MEDIUM confidence)
- [OpenRent Scraper on Apify](https://apify.com/lexis-solutions/openrent-co-uk-scraper) -- scraping capabilities (MEDIUM confidence)
- [Property Redress Scheme - R2R Guide](https://www.propertyredress.co.uk/resources/rent-to-rent-or-guaranteed-rent---agent-guide) -- legal requirements (HIGH confidence)
- [Ashmore Residential - PM vs Self-Managing 2026](https://www.ashmoreresidential.com/ar-news/property-management-vs-self-managing-landlords-london/) -- landlord pain points (MEDIUM confidence)
- [Citywide Housing - Self-Managing Regrets 2026](https://www.citywidehousing.co.uk/self-managing-landlords-in-2026-why-many-regret-it/) -- tired landlord signals (MEDIUM confidence)
- [Kennedys Law - Renters' Rights Act](https://www.kennedyslaw.com/en/thought-leadership/article/2026/the-renters-rights-act-what-s-changing-what-it-means-for-landlords-and-how-to-mitigate-risks/) -- regulatory changes (HIGH confidence)
- [Landlord Studio - Rent to Rent UK 2025](https://www.landlordstudio.com/uk-blog/what-is-rent-to-rent-and-is-it-legal) -- R2R structure and legality (HIGH confidence)
- [Kamma - UK Property Licensing Data](https://www.kammadata.com/uk-property-licensing-data/) -- commercial licensing data aggregator (MEDIUM confidence)

---
*Feature research for: UK Property Management Landlord Lead Generation*
*Researched: 2026-03-28*
