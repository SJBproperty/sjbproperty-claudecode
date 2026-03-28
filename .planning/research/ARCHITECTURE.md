# Architecture Research

**Domain:** UK Landlord Lead Generation Pipeline (Property Management)
**Researched:** 2026-03-28
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LAYER 1: DATA INGESTION                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌───────┐ │
│  │  Council   │ │   Land    │ │ Companies │ │ Portals  │ │  EPC  │ │
│  │    HMO     │ │ Registry  │ │   House   │ │ RM/Z/OR  │ │ Reg.  │ │
│  │ Registers  │ │ CCOD/OCOD │ │    API    │ │ Scrapers │ │  API  │ │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └───┬───┘ │
│        │              │             │             │           │     │
├────────┴──────────────┴─────────────┴─────────────┴───────────┴─────┤
│                     LAYER 2: RAW DATA STORE                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │            SQLite — raw_records table (append-only)          │   │
│  │       (id, source_type, raw_json, postcode, scraped_at)     │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                      │
├─────────────────────────────┴──────────────────────────────────────-┤
│                  LAYER 3: ENTITY RESOLUTION                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   Dedup Engine: address normalisation + fuzzy name match     │   │
│  │   UPRN linkage where available, postcode blocking            │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                      │
├─────────────────────────────┴──────────────────────────────────────-┤
│                  LAYER 4: ENRICHED DATA MODEL                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Landlord │──│ Property │──│  Source   │──│    Compliance    │   │
│  │  Entity  │  │  Entity  │  │ Evidence │  │     Records      │   │
│  └────┬─────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│       │                                                            │
├───────┴────────────────────────────────────────────────────────────-┤
│                  LAYER 5: SCORING & CATEGORISATION                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   Tired Landlord Score (0-100) + BTL vs R2R classification  │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                      │
├─────────────────────────────┴──────────────────────────────────────-┤
│                  LAYER 6: CRM & OUTREACH                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │   Lead   │  │ Outreach │  │ Response │  │   Conversion     │   │
│  │  Queue   │  │ Campaigns│  │ Tracking │  │    Tracking      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

           Claude Code: Orchestration, analysis, content generation
           at every layer via CLI + MCP tools
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Council HMO Scraper** | Extract licensed HMO data from Stockport and Manchester councils | Python scripts; HTML scraping or FOI CSV parsing |
| **Land Registry Ingestor** | Download and filter CCOD/OCOD datasets for target postcodes | Bulk CSV download from use-land-property-data.service.gov.uk, filter locally |
| **Companies House Connector** | Search for SPV landlords and property companies in target area | Official REST API (free, API key, 600 req/5 min) |
| **Portal Scrapers** | Extract listings from Rightmove, Zoopla, OpenRent | Apify actors (pay-per-run, ~$5-25 per batch) |
| **EPC API Client** | Query domestic certificates by postcode | Official API at epc.opendatacommunities.org (free, registration required) |
| **Raw Data Store** | Persist all ingested data with source provenance | SQLite database, append-only raw_records table |
| **Dedup Engine** | Resolve entities across 5 sources into unified landlord records | Address normalisation + postcode blocking + fuzzy name matching |
| **Scoring Engine** | Calculate tired landlord score and BTL vs R2R classification | Rule-based weighted scoring algorithm |
| **CRM Sync** | Push scored leads to visual review layer | Export to Airtable (or HubSpot) via API |
| **Outreach Tracker** | Track which leads received which outreach and responses | CRM layer with pipeline stages |

## Recommended Project Structure

```
lead-pipeline/
├── scrapers/               # Data ingestion scripts
│   ├── council_hmo.py      # Stockport + Manchester HMO register scrapers
│   ├── land_registry.py    # CCOD/OCOD CSV downloader and postcode filter
│   ├── companies_house.py  # Companies House API client
│   ├── portals.py          # Rightmove/Zoopla/OpenRent via Apify
│   └── epc.py              # EPC API client
├── processing/             # Data transformation
│   ├── normalise.py        # Address and name standardisation
│   ├── dedup.py            # Entity resolution / deduplication
│   ├── enrich.py           # Contact detail enrichment
│   └── score.py            # Tired landlord scoring + categorisation
├── models/                 # Data model definitions
│   ├── schema.sql          # SQLite schema
│   └── types.py            # Dataclass definitions
├── export/                 # Output and sync
│   ├── crm_sync.py         # Push scored leads to Airtable/HubSpot
│   └── reports.py          # Summary reports
├── templates/              # Outreach content
│   ├── letters/            # Direct mail templates
│   ├── emails/             # Email sequence templates
│   └── scripts/            # Phone call scripts
├── config/                 # Configuration
│   ├── postcodes.json      # Target SK + M14-M22 postcodes
│   ├── scoring.json        # Scoring weights and thresholds
│   └── api_keys.env        # API credentials (gitignored)
├── data/                   # Local data directory (gitignored)
│   ├── raw/                # Raw downloaded CSV files
│   └── pipeline.db         # SQLite database
└── run.py                  # Main orchestration script
```

### Structure Rationale

- **scrapers/:** Each data source has its own module because access methods differ (API vs CSV download vs HTML scrape vs Apify actor). Isolated for independent testing and scheduling.
- **processing/:** Separated from scrapers because dedup and scoring run across all sources. These stages read from all raw records regardless of origin.
- **models/:** Single source of truth for data schema. SQLite schema and Python types stay in sync.
- **export/:** Decoupled from processing so the CRM backend can be swapped without touching the pipeline.
- **templates/:** Content generation is separate from data. Claude Code generates and iterates on these.

## Architectural Patterns

### Pattern 1: Append-Only Raw Store

**What:** Never modify or delete raw scraped data. Every scrape run appends new records with timestamps and source tags.
**When to use:** Always. Non-negotiable for audit trails and debugging.
**Trade-offs:** Uses more storage, but at this scale (thousands of records) SQLite databases stay well under 100MB.

```python
def store_raw(db, source_type: str, records: list[dict]):
    """Append raw records — never update or delete existing rows."""
    db.executemany(
        "INSERT INTO raw_records (source_type, raw_data, postcode, scraped_at) VALUES (?, ?, ?, ?)",
        [(source_type, json.dumps(r), r.get('postcode'), datetime.utcnow()) for r in records]
    )
```

### Pattern 2: Postcode-Blocked Entity Resolution

**What:** Only compare records sharing the same outward postcode (e.g., SK4, M14). Reduces comparison space from O(n^2) to O(n * k) where k is block size.
**When to use:** Whenever deduplicating across data sources.
**Trade-offs:** Misses matches where a landlord's registered address differs from their property postcode. Mitigate with secondary blocking on company number (for SPVs) and surname initial.

```python
def block_by_postcode(records):
    """Group records by outward postcode for comparison."""
    blocks = defaultdict(list)
    for r in records:
        outward = r['postcode'].split()[0] if r.get('postcode') else 'UNKNOWN'
        blocks[outward].append(r)
    return blocks
```

### Pattern 3: Human-in-the-Loop Gate

**What:** Automated pipeline stops at a review queue. No outreach fires without Sam's explicit approval in the CRM.
**When to use:** Always. This is a project requirement.
**Trade-offs:** Slower throughput, but prevents errors (wrong person contacted, duplicate outreach, inappropriate messaging). For 50-100 high-quality leads, manual review is feasible and desirable.

### Pattern 4: Score Decomposition

**What:** Store individual scoring factors separately from the total score. Each factor is a row in score_breakdown with its points contribution.
**When to use:** For every scored lead.
**Trade-offs:** More database rows, but allows Sam to understand why a lead scored high, and allows tuning individual weights without rescoring everything.

## Data Model

### Core Schema

```sql
-- Every raw record from every source, preserved for audit
CREATE TABLE raw_records (
    id INTEGER PRIMARY KEY,
    source_type TEXT NOT NULL,        -- 'hmo_register', 'land_registry', 'companies_house', 'portal', 'epc'
    source_ref TEXT,                  -- Original ID from source
    raw_data TEXT NOT NULL,           -- JSON blob of original record
    postcode TEXT,                    -- Extracted for blocking
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Resolved landlord entity (after dedup)
CREATE TABLE landlords (
    id INTEGER PRIMARY KEY,
    canonical_name TEXT NOT NULL,     -- Best version of their name
    entity_type TEXT,                 -- 'individual', 'company', 'spv'
    company_number TEXT,             -- Companies House number if applicable
    phone TEXT,
    email TEXT,
    contact_address TEXT,
    portfolio_size INTEGER DEFAULT 1,
    tired_score INTEGER,             -- 0-100
    lead_category TEXT,              -- 'btl_management', 'guaranteed_rent', 'both', 'disqualified'
    status TEXT DEFAULT 'new',       -- 'new', 'reviewing', 'approved', 'contacted', 'responded', 'converted', 'dead'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Properties linked to landlords
CREATE TABLE properties (
    id INTEGER PRIMARY KEY,
    landlord_id INTEGER REFERENCES landlords(id),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    postcode TEXT NOT NULL,
    uprn TEXT,                       -- Unique Property Reference Number (from EPC data)
    property_type TEXT,              -- 'house', 'flat', 'hmo', 'commercial'
    tenure TEXT,                     -- 'freehold', 'leasehold'
    epc_rating TEXT,                 -- A-G
    epc_expiry DATE,
    is_hmo_licensed BOOLEAN DEFAULT FALSE,
    hmo_licence_expiry DATE,
    last_listed_date DATE,           -- From portal data
    days_on_market INTEGER,
    listing_quality_score INTEGER,   -- 1-5, from portal analysis
    estimated_rent INTEGER,          -- Monthly in pence
    last_sale_price INTEGER,         -- In pence
    last_sale_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Which raw records contributed to each landlord (provenance)
CREATE TABLE source_evidence (
    id INTEGER PRIMARY KEY,
    landlord_id INTEGER REFERENCES landlords(id),
    property_id INTEGER REFERENCES properties(id),
    raw_record_id INTEGER REFERENCES raw_records(id),
    source_type TEXT NOT NULL,
    confidence REAL,                 -- 0.0-1.0 match confidence
    matched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scoring breakdown (audit trail for score justification)
CREATE TABLE score_breakdown (
    id INTEGER PRIMARY KEY,
    landlord_id INTEGER REFERENCES landlords(id),
    factor TEXT NOT NULL,            -- 'void_period', 'poor_listing', 'epc_gap', 'multi_property', etc.
    raw_value TEXT,                  -- The actual data point
    points INTEGER,                 -- Points awarded for this factor
    scored_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Outreach tracking
CREATE TABLE outreach (
    id INTEGER PRIMARY KEY,
    landlord_id INTEGER REFERENCES landlords(id),
    channel TEXT NOT NULL,           -- 'letter', 'email', 'phone', 'linkedin'
    campaign TEXT,                   -- Campaign name/identifier
    content_ref TEXT,                -- Reference to template used
    sent_at DATETIME,
    status TEXT DEFAULT 'pending',   -- 'pending', 'sent', 'delivered', 'opened', 'responded', 'bounced'
    response_notes TEXT,
    follow_up_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GDPR suppression list: people who must never be contacted
CREATE TABLE suppression_list (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    reason TEXT,                      -- 'opt_out', 'deceased', 'already_managed', 'complaint'
    suppressed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Entity Relationships

```
Landlord (1) ──── (N) Property
    │                    │
    │                    │
    └── (N) SourceEvidence ──── (1) RawRecord
    │
    └── (N) ScoreBreakdown
    │
    └── (N) Outreach
```

**Key design decisions:**
- **Landlord is the central entity**, not Property. The pipeline finds people to sell to; properties are evidence of their situation.
- **SourceEvidence** is the many-to-many join preserving provenance. You can always trace which raw record produced which landlord match.
- **ScoreBreakdown** stores individual scoring factors so you can explain and audit why someone scored 85/100.
- **RawRecords** are never modified or deleted. Append-only audit trail.

## Data Flow

### End-to-End Pipeline Flow

```
[1. SCRAPE]                    [2. STORE RAW]
  Council HMO ─────┐
  Land Registry ────┤
  Companies House ──┼──────→  SQLite raw_records table
  Portal listings ──┤           (append-only, timestamped)
  EPC Register ─────┘

[3. NORMALISE]                 [4. DEDUPLICATE]
  raw_records ──→ Address      Postcode blocking ──→ Fuzzy match
                  normalisation   ──→ UPRN linkage ──→ Confidence
                  Name cleanup       scoring ──→ Merge/Link

[5. CREATE ENTITIES]           [6. ENRICH]
  Dedup results ──→ landlords    Landlord entity ──→ Contact lookup
                    properties      (192.com, LinkedIn, Companies House
                    source_evidence   director addresses)

[7. SCORE]                     [8. CATEGORISE]
  All signals ──→ Weighted      Score + attributes ──→ BTL Mgmt
                  scoring ──→      or Guaranteed Rent
                  0-100 score      or Both

[9. REVIEW QUEUE]              [10. OUTREACH]
  Hot leads ──→ Manual review    Approved leads ──→ Letter/Email/
  by Sam ──→ Approve/Reject       Phone/LinkedIn
              Add notes            (semi-automated)

[11. TRACK]
  Outreach sent ──→ Response tracking ──→ Follow-up scheduling
                     ──→ Conversion tracking
```

### Key Data Flows

1. **Scrape-to-Store:** Each scraper independently writes to raw_records. Scrapers can fail independently without affecting others.
2. **Store-to-Dedup:** Dedup engine reads all raw records, groups by postcode block, matches within blocks, writes resolved entities.
3. **Score-to-CRM:** Only leads scoring 45+ are synced to the CRM layer. Below that threshold, they stay in SQLite only.
4. **CRM-to-Outreach:** Sam reviews in CRM (Airtable or HubSpot), approves leads, then content generation and sending occurs.

## Deduplication Strategy

Five sources use different identifiers. This is the hardest architectural problem.

| Source | Primary Key | Name Format | Address Format |
|--------|------------|-------------|----------------|
| Council HMO | Licence number | "Mr J Smith" or "J Smith" | Varies wildly |
| Land Registry CCOD | Title number | Company name only | Registered address |
| Companies House | Company number | Company name | Registered office |
| Portal listings | Listing URL | Agent name or none | Property address |
| EPC Register | LMK key / UPRN | Lodging name (often assessor) | Property address |

### Resolution Algorithm

**Step 1: Address Normalisation**
- Strip flat/unit prefixes, standardise road/street/avenue abbreviations
- Normalise postcodes to uppercase no-space format (e.g., "SK41AB")
- Extract UPRN where available (EPC data includes it)

**Step 2: Postcode Blocking**
- Only compare records sharing same outward postcode (reduces O(n^2) to manageable)
- Secondary blocking on company number and surname initial

**Step 3: Property-Level Matching**
- Match on normalised address within same postcode block
- Fuzzy match using Levenshtein distance, threshold 85%+
- UPRN match is definitive where available

**Step 4: Landlord-Level Matching**
- Company name: fuzzy match + Companies House number cross-reference
- Individual name: surname match + first initial + shared property address = probable match
- Cross-source: if Land Registry says "ABC Properties Ltd" owns 15 High St, and Companies House has "ABC Properties Ltd" (company 12345678), link them

**Step 5: Confidence Scoring**
- UPRN match = 1.0 confidence
- Exact address + exact name = 0.95
- Fuzzy address + exact name = 0.80
- Exact address + fuzzy name = 0.75
- Below 0.70 = flag for manual review

**Implementation:** Python `rapidfuzz` library for fuzzy string matching (fast C implementation). At this scale (500-2,000 records per source for target postcodes), no ML-based entity resolution is needed.

## Scoring Algorithm

### Tired Landlord Score (0-100)

| Signal | Points | Source | Detection Method |
|--------|--------|--------|-----------------|
| Void period 30+ days | 20 | Portal | Days on market from listing date |
| Void period 60+ days | 30 | Portal | Extended vacancy (replaces 30-day points) |
| Poor listing quality | 15 | Portal | Few photos (<5), short description, no floorplan |
| Expired/missing EPC | 10 | EPC API | Certificate expiry date past or no record |
| Low EPC rating (E-G) | 10 | EPC API | Compliance pressure + upgrade cost |
| Multi-property (3-5) | 10 | Cross-source | Portfolio count from dedup |
| Multi-property (6+) | 15 | Cross-source | Larger portfolio = more management burden |
| Self-managing | 15 | Portal | Listed directly on OpenRent, no agent branding |
| HMO without agent | 10 | HMO Register + Portal | Licensed HMO but self-listed |
| Company/SPV owner | 5 | Land Registry/CH | Corporate structure suggests investor mindset |
| Absentee owner | 10 | Land Registry | Registered address differs from property postcode |
| Price drop on listing | 5 | Portal | Reduced price = struggling to let |

**Scoring tiers:**
- 70-100: **Hot** — Multiple tired signals, prioritise for outreach
- 45-69: **Warm** — Some signals, include in campaigns
- 20-44: **Cool** — Few signals, low priority
- 0-19: **Cold** — Likely well-managed, skip

### BTL Management vs Guaranteed Rent Classification

The two pipelines diverge at categorisation based on landlord profile:

```
IF tired_score >= 45:
    IF portfolio_size >= 3 AND entity_type == 'company':
        category = 'guaranteed_rent'      # Portfolio landlord wanting certainty
    ELIF absentee_owner == True:
        category = 'guaranteed_rent'      # Remote owner wanting zero hassle
    ELIF portfolio_size <= 2 AND entity_type == 'individual':
        category = 'btl_management'       # Overwhelmed small landlord
    ELIF has_compliance_gaps:
        category = 'btl_management'       # Needs someone to handle compliance
    ELSE:
        category = 'both'                 # Could go either way — dual approach
```

**How the pipelines diverge at outreach:**

| Aspect | BTL Management | Guaranteed Rent |
|--------|---------------|-----------------|
| Value proposition | "We handle the hassle, you keep control" | "Fixed income, zero hassle, we take the risk" |
| Lead letter tone | Focus on compliance burden, void costs, tenant issues | Focus on guaranteed income, no void risk, free upgrades |
| Phone script | Ask about their worst tenant experience | Ask what they would do with guaranteed monthly income |
| Pricing discussed | 10% of gross rent | Commercial lease terms (3-10 year) |
| Qualification bar | Any property type, any condition | Must stack financially for SJB (rent arbitrage margin) |

## Data Storage Architecture

**Use SQLite for the pipeline database. Use Airtable (or HubSpot) for the CRM/review layer.**

| Requirement | SQLite | Airtable | Google Sheets |
|-------------|--------|----------|---------------|
| Store 5,000+ raw records | Excellent | Hits limits on free tier | Poor at scale |
| Complex queries (joins, aggregation) | Excellent | Limited | Very limited |
| Programmatic access from scripts | Excellent | Good (API) | Okay (API) |
| Visual review by Sam | Poor (no UI) | Excellent | Good |
| Outreach tracking with views/filters | Poor | Excellent | Adequate |
| Automation triggers | N/A | Built-in | Via Zapier |
| Cost | Free | Free tier or Pro ~GBP16/month | Free |
| Offline operation | Yes | No | No |

**Why two layers:** SQLite handles the heavy lifting (scrape, store, dedup, score) where SQL power matters. Airtable (or HubSpot free tier) provides the visual, mobile-friendly interface Sam needs to review leads from Abu Dhabi, approve outreach, and track responses. A sync script bridges them.

## Where Claude Code Fits

| Pipeline Stage | Claude Code Role | Mechanism |
|----------------|-----------------|-----------|
| **1. Scrape** | Orchestrate scraping scripts, handle errors | CLI commands, Apify MCP tools |
| **3. Normalise** | Address parsing edge cases, name disambiguation | Analysis prompts on ambiguous records |
| **6. Enrich** | Find contact details from web sources | WebSearch, WebFetch for LinkedIn/company websites |
| **7. Score** | Analyse listing quality (photo count, description quality) | Multimodal analysis of listing pages |
| **8. Categorise** | Nuanced categorisation for edge cases | Prompt-based classification with reasoning |
| **9. Review** | Summarise lead profiles for Sam's review | Generate lead briefs with key signals highlighted |
| **10. Outreach** | Generate personalised letters, emails, scripts | Content generation using templates + lead-specific data |
| **11. Track** | Log responses, suggest follow-up timing | CRM updates via API calls |

## Integration Points

### External Services

| Service | Integration Pattern | Rate Limits / Costs | Notes |
|---------|---------------------|---------------------|-------|
| EPC Open Data API | REST API with auth token | Unclear limits; free | Register at epc.opendatacommunities.org. Postcode-based queries. Service transitioning to new platform by end of March 2026. |
| Companies House API | REST API with API key | 600 requests per 5 minutes; free | Search by SIC code 68100 (real estate) + registered office postcode. |
| Land Registry CCOD/OCOD | Bulk CSV download | Monthly update; free | ~3M rows total. Download once, filter locally by target postcodes. Requires free account. |
| Rightmove/Zoopla (Apify) | Apify Actor API | Pay per compute unit (~$5-25/run) | Rightmove scraper: ~25 properties in 5 seconds. Schedule weekly. |
| OpenRent | Direct scrape or Apify | Generally more permissive than RM/Z | Self-managing landlords here are highest-value signal. |
| Stockport Council HMO | FOI request or HTML scrape | One-time pull, refresh quarterly | FOI route confirmed viable via WhatDoTheyKnow. |
| Manchester City Council HMO | Same approach | Same | Check data.gov.uk first for structured downloads. |
| Airtable (CRM layer) | REST API | 5 requests/second; free tier 1,000 records | Sync scored leads from SQLite. |
| Stannp (direct mail) | REST API | Pay per letter (~GBP0.70-1.50/letter) | Programmatic letter sending with templates. |
| Instantly.ai (email) | REST API | From ~$30/month for 5K emails | Email warmup and sending. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Scrapers to Raw Store | Direct SQLite inserts | Each scraper writes to raw_records with its source_type |
| Raw Store to Dedup Engine | SQL queries with postcode filter | Dedup reads raw, writes to landlords + properties + source_evidence |
| Dedup Engine to Scoring | Direct function calls | Scoring reads enriched entities, writes score + breakdown |
| Scoring to CRM Sync | Batch export script | Push leads with score >= 45 to Airtable/HubSpot |
| CRM to Outreach | Manual trigger by Sam | Sam reviews, approves, then templates generate content |

## Anti-Patterns

### Anti-Pattern 1: Monolithic Scrape-and-Score Script

**What people do:** Write one giant script that scrapes all sources, deduplicates, scores, and outputs a CSV in a single run.
**Why it's wrong:** Any failure in one source kills the entire pipeline. Cannot re-run scoring without re-scraping. Cannot add new sources without modifying everything.
**Do this instead:** Separate scraping, deduplication, scoring, and export into independent stages with the SQLite database as the handoff point between them.

### Anti-Pattern 2: Matching on Name Alone

**What people do:** Try to match "J Smith" from the HMO register with "John Smith" from Land Registry by name similarity alone.
**Why it's wrong:** Names are highly ambiguous. "J Smith" could be thousands of people. False merges corrupt the dataset.
**Do this instead:** Always require address co-occurrence. Two records are the same landlord only if they share a name similarity AND a property address match. UPRN is the gold standard where available.

### Anti-Pattern 3: Over-Engineering Infrastructure

**What people do:** Build a cloud-deployed, containerised, event-driven architecture with message queues and microservices.
**Why it's wrong:** This is a 50-100 lead pipeline run by one person. Cloud infrastructure adds cost, complexity, and debugging overhead for zero benefit at this scale.
**Do this instead:** SQLite + local Python scripts + Claude Code orchestration. Ship fast, refactor only if scale demands it.

### Anti-Pattern 4: Automated Outreach Without Review

**What people do:** Wire the scoring engine directly to email sending. High-score leads automatically receive outreach.
**Why it's wrong:** Scoring models are imperfect. A landlord might score 90 but be deceased, already under management, or otherwise inappropriate to contact. Also a GDPR risk.
**Do this instead:** The human gate is a feature, not a bug. Sam reviews, approves, and personalises before any contact is made.

### Anti-Pattern 5: Storing Personal Data in Git

**What people do:** Commit SQLite databases or CSV exports containing landlord personal data to the repository.
**Why it's wrong:** GDPR violation. Landlord names, emails, phone numbers are personal data. A public repo makes this worse.
**Do this instead:** Add `*.db`, `*.sqlite`, `*.csv`, `data/` to `.gitignore`. Encrypt if stored in cloud backup.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 leads (MVP) | SQLite + Airtable free tier. Manual review. Run pipeline weekly via Claude Code. |
| 100-500 leads | Same stack. Add email automation (Instantly.ai). Airtable automations for follow-up reminders. |
| 500-2,000 leads | Airtable Pro or migrate CRM to HubSpot/Pipedrive (~GBP12-18/month). Phone enrichment service. |
| 2,000+ leads | PostgreSQL replaces SQLite. Proper CRM. Consider hiring a VA for outreach execution. |

### Scaling Priorities

1. **First bottleneck: Contact enrichment.** Scraping and scoring are straightforward. Finding actual phone numbers and email addresses for individual landlords (not companies) is the hardest and most manual part.
2. **Second bottleneck: Outreach capacity.** One person can only make so many calls and send so many personalised letters per week. If the pipeline generates 200 hot leads, Sam cannot contact them all. Ruthless prioritisation via scoring is essential.

## GDPR Compliance Architecture

UK GDPR compliance must be baked into the architecture, not bolted on.

| Requirement | Architectural Implication |
|-------------|--------------------------|
| **Lawful basis** | Legitimate interest for B2B marketing to landlords. Document a Legitimate Interest Assessment (LIA). ICO recognises direct marketing as a legitimate interest, but it must pass the three-part test (purpose, necessity, balancing). |
| **Data minimisation** | Only store data needed for lead generation. Do not hoard irrelevant personal data. |
| **Right to erasure** | Must be able to delete a landlord and all associated records. Cascade deletes in schema. The `suppression_list` table ensures they are never re-scraped. |
| **Audit trail** | The `source_evidence` and `raw_records` tables provide full provenance. |
| **Opt-out mechanism** | Every outreach must include opt-out instructions. Opted-out landlords go on suppression list permanently. |
| **PECR for email** | B2B email under PECR: can email corporate subscribers if relevant to their role + provide opt-out. Sole traders and partnerships treated as individuals (need consent). |
| **Direct mail** | PECR does not cover postal mail. GDPR legitimate interest is sufficient for letters. Letters are the safest first-contact channel. |

## Suggested Build Order (Roadmap Implications)

Build order follows data dependencies. You cannot score what you have not scraped, and you cannot outreach without scores.

```
Phase 1: Foundation
  ├── SQLite schema + data model
  ├── EPC API scraper (easiest API, richest single source)
  ├── Address normalisation utilities
  └── Tool/MCP setup for Claude Code integration

Phase 2: Remaining Data Sources
  ├── Land Registry CCOD/OCOD ingestor
  ├── Companies House API connector
  ├── Portal scrapers (Rightmove/Zoopla/OpenRent via Apify)
  └── Council HMO register scraper (FOI + HTML scrape)

Phase 3: Intelligence Layer
  ├── Deduplication engine (postcode blocking + fuzzy matching)
  ├── Entity resolution across all sources
  └── Scoring algorithm with decomposed factors

Phase 4: Contact Enrichment & Categorisation
  ├── Contact detail enrichment (phone, email, mailing address)
  ├── BTL Management vs Guaranteed Rent classification
  └── CRM sync (Airtable or HubSpot)

Phase 5: Outreach Infrastructure
  ├── Letter/email/phone script template generation
  ├── Direct mail integration (Stannp API)
  ├── Email automation (Instantly.ai)
  └── Outreach tracking and follow-up scheduling

Phase 6: Optimisation
  ├── Scoring weight tuning based on conversion data
  ├── Re-scrape scheduling (weekly portals, monthly registers)
  └── Pipeline health monitoring
```

**Dependencies:** Phase 1 depends on nothing. Phase 2 needs Phase 1 schema. Phase 3 needs Phase 2 data. Phase 4 needs Phase 3 entities. Phase 5 needs Phase 4 contacts. Phase 6 needs Phase 5 results. Within Phase 2, all scrapers are independent and can be built in parallel.

**Critical path:** EPC scraper in Phase 1 is the quickest win — it provides landlord names, property addresses, EPC ratings, and UPRNs in a single API call. Start there, prove the pipeline end-to-end with one source, then expand.

## Sources

- [EPC Open Data API Documentation](https://epc.opendatacommunities.org/docs/api/domestic) — HIGH confidence
- [HM Land Registry CCOD/OCOD Datasets](https://use-land-property-data.service.gov.uk/) — HIGH confidence
- [Companies House API Developer Portal](https://developer.company-information.service.gov.uk/) — HIGH confidence
- [Apify Rightmove Scraper](https://apify.com/automation-lab/rightmove-scraper) — MEDIUM confidence
- [Apify Zoopla Scraper](https://apify.com/dhrumil/zoopla-scraper) — MEDIUM confidence
- [ICO Legitimate Interests Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/) — HIGH confidence
- [ICO Direct Marketing Lawful Basis](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/sending-direct-marketing-choosing-your-lawful-basis/) — HIGH confidence
- [Stockport Council HMO Information](https://www.stockport.gov.uk/information-for-landlords/houses-in-multiple-occupation) — MEDIUM confidence
- [WhatDoTheyKnow FOI for Stockport HMO Data](https://www.whatdotheyknow.com/request/list_of_licensed_hmo_properties_18) — HIGH confidence (FOI route confirmed viable)
- [PropertyData National HMO Register](https://propertydata.co.uk/national-hmo-register) — MEDIUM confidence (paid aggregator alternative)
- [dedupe Python Library](https://github.com/dedupeio/dedupe) — MEDIUM confidence
- [rapidfuzz for Fuzzy Matching](https://github.com/rapidfuzz/RapidFuzz) — HIGH confidence
- [MHCLG Blog: Changes to EPC Open Data](https://mhclgdigital.blog.gov.uk/2026/03/04/shaping-the-future-of-open-data-with-open-data-communities/) — HIGH confidence (service transitioning March 2026)

---
*Architecture research for: UK Landlord Lead Generation Pipeline*
*Researched: 2026-03-28*
