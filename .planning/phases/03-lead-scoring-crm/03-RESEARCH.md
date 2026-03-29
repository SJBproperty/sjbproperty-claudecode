# Phase 3: Lead Scoring & CRM - Research

**Researched:** 2026-03-29
**Domain:** Lead scoring algorithms, contact enrichment APIs, CRM integration
**Confidence:** HIGH

## Summary

Phase 3 transforms 9,545 landlord records into a prioritised, enriched pipeline ready for outreach. The work breaks into three distinct technical domains: (1) a scoring algorithm that reads existing SQLite data and produces a 0-100 tired landlord score, (2) contact enrichment via Snov.io API and Companies House re-queries, and (3) HubSpot CRM import via CSV with manual pipeline/stage configuration.

The scoring algorithm is straightforward computation against existing data -- no external APIs needed. The key challenge is handling sparse data: only 1,110 properties have void_days, only 1,000 have listing_quality_score, and only 110 landlords come from OpenRent (the only source with self-managing status). The scoring must degrade gracefully when signals are missing rather than penalising landlords for data gaps.

HubSpot free tier is well-suited for this use case: it supports up to 10 custom properties, 1 deal pipeline (sufficient since CONTEXT.md specifies a single pipeline), and API access via private app tokens. The 1,000-contact limit reported by some sources applies to marketing contacts only -- CRM contacts (what we need) remain at 1,000,000 on free tier. CSV import is the simplest path for initial load. Follow-up task automation must be script-generated since HubSpot free has no workflow automation.

**Primary recommendation:** Build three scripts in sequence -- `score-landlords.js`, `enrich-contacts.js`, `export-hubspot.js` -- following the established flat JS + SQLite pattern. Score first, enrich the top-scored, export to HubSpot CSV.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Scoring weights: Void periods 30-40%, EPC rating 25-30%, Listing quality 15-20%, Self-managing status 10-15%, Portfolio size sweet spot 2-5 properties, Compliance gaps use what is available
- Score threshold: 50+ enters pipeline (targeting approximately 200-300 leads)
- R2R classification: Simple binary -- has HMO licence = R2R eligible. Both BTL and R2R flags allowed simultaneously
- BTL suitability: Tired score 50+ and not exclusively HMO = BTL-suitable by default
- Contact enrichment priority: Snov.io first, then Vibe Prospecting MCP. Batch by score tier (highest first)
- Enrichment schema: Add columns directly to landlords table (email, phone, linkedin_url, mailing_address, enrichment_source, enrichment_date)
- Companies House directors: Auto-extract registered office addresses, flag service addresses
- No-contact leads: PRIME direct mail candidates -- do NOT deprioritise
- HubSpot import: One-time CSV import. Single pipeline with BTL/R2R custom property tag
- Pipeline stages: New Lead -> Contacted -> Follow Up -> Consultation Booked -> Proposal Sent -> Signed -> Onboarding
- Follow-up automation: Time-based tasks coded in export/import script, NOT HubSpot workflows
- Custom properties to import: tired_landlord_score, btl_suitable, r2r_suitable, entity_type, property_count, data_sources, epc_rating, void_days

### Claude's Discretion
- Exact weight percentages within specified ranges
- Score formula implementation (linear vs stepped vs logarithmic)
- Handling landlords with no void data
- HubSpot CSV format specifics and custom property field types
- Vibe Prospecting MCP configuration and integration
- LinkedIn Apify actor selection
- Service address detection heuristics for Companies House addresses

### Deferred Ideas (OUT OF SCOPE)
- Google Maps Street View URLs
- Automated re-scraping schedule (AUTO-01)
- Score refinement from conversion data (AUTO-02)
- Automated CRM sync via API (AUTO-03)

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTEL-02 | Tired landlord scoring algorithm (0-100) with weighted signals | Scoring architecture section: stepped scoring with graceful degradation for missing data. All signal sources mapped to DB columns |
| INTEL-03 | BTL Management lead classification | Classification logic: score 50+ AND not exclusively HMO = BTL-suitable. Multiple tired signals stacking |
| INTEL-04 | R2R/Guaranteed Rent lead classification (HMO only) | Simple binary: landlord has HMO licence in DB (2,103 HMO register records). Cross-reference via hmo_licence_number on landlords table |
| INTEL-05 | Contact enrichment (phone, email, LinkedIn, addresses) | Snov.io API v2 endpoints documented, Companies House officer re-query pattern established, enrichment column schema defined |
| CRM-01 | HubSpot free tier CRM setup with pipeline stages | HubSpot free tier supports 1 pipeline, up to 10 custom properties, CSV import. Pipeline stages defined in CONTEXT.md |
| CRM-02 | Import scored leads with enriched data into HubSpot | CSV export script pattern from build-lead-list.js. HubSpot column mapping documented |
| CRM-03 | Follow-up reminders and task automation | Script-generated follow-up dates in CSV (HubSpot free has no workflow automation). Task fields documented |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.8.0 | SQLite read/write for scoring + enrichment columns | Already in project, synchronous API ideal for batch scoring |
| csv-stringify | 6.7.0 | HubSpot CSV export generation | Already in project, used by build-lead-list.js |
| dotenv | 17.3.1 | API key management (Snov.io, HubSpot) | Already in project pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node built-in https | n/a | Snov.io API calls | Follows companies-house.js pattern -- no axios needed |
| csv-parse | 6.2.1 | Parse Snov.io CSV results if using bulk upload flow | Already in project |

### Not Needed
| Library | Reason |
|---------|--------|
| @hubspot/api-client (13.5.0) | CSV import is simpler than API for one-time load. API adds complexity without benefit for v1 |
| axios/node-fetch | Project uses native https (see companies-house.js pattern). Keep consistent |

**Installation:**
```bash
# No new packages needed -- all dependencies already in project
```

## Architecture Patterns

### Recommended Project Structure
```
scripts/
  score-landlords.js        # INTEL-02, INTEL-03, INTEL-04 -- scoring + classification
  enrich-contacts.js        # INTEL-05 -- Snov.io API + CH officer lookups
  export-hubspot.js         # CRM-01, CRM-02, CRM-03 -- CSV export for HubSpot import
  lib/
    db.js                   # Existing -- extend with migration for new columns
    config.js               # Existing -- extend with Snov.io config
    scoring.js              # NEW -- pure scoring functions (testable)
data/
  exports/
    hubspot-import-YYYY-MM-DD.csv
    hubspot-deals-YYYY-MM-DD.csv
```

### Pattern 1: Stepped Scoring with Graceful Degradation
**What:** Each signal contributes points on a stepped scale. Missing data = 0 contribution (not penalty).
**When to use:** When data coverage varies across landlords (which it does heavily here).
**Example:**
```javascript
// Scoring pure function -- no DB dependency, fully testable
function scoreLandlord(landlord) {
  let score = 0;
  let maxPossible = 0;

  // Void periods (35% weight = 35 points max)
  if (landlord.max_void_days !== null) {
    maxPossible += 35;
    if (landlord.max_void_days >= 90) score += 35;
    else if (landlord.max_void_days >= 60) score += 25;
    else if (landlord.max_void_days >= 30) score += 15;
    else score += 5; // Has void data but short voids
  }

  // EPC rating (28% weight = 28 points max)
  if (landlord.worst_epc) {
    maxPossible += 28;
    const epcPoints = { G: 28, F: 24, E: 18, D: 10 };
    score += epcPoints[landlord.worst_epc] || 0;
  }

  // Listing quality (18% weight = 18 points max, INVERTED -- low quality = high score)
  if (landlord.avg_listing_quality !== null) {
    maxPossible += 18;
    if (landlord.avg_listing_quality < 25) score += 18;
    else if (landlord.avg_listing_quality < 50) score += 12;
    else if (landlord.avg_listing_quality < 75) score += 6;
  }

  // Self-managing (12% weight = 12 points)
  if (landlord.is_self_managing) {
    maxPossible += 12;
    score += 12;
  }

  // Portfolio size (7% weight = 7 points, sweet spot 2-5)
  if (landlord.property_count > 0) {
    maxPossible += 7;
    if (landlord.property_count >= 2 && landlord.property_count <= 5) score += 7;
    else if (landlord.property_count === 1) score += 2;
    else if (landlord.property_count <= 8) score += 4;
    // 9+ = 0 points (likely has agent)
  }

  // Normalise to 0-100 based on available signals
  // If only 2 signals available, scale up proportionally
  if (maxPossible === 0) return 0;
  return Math.round((score / maxPossible) * 100);
}
```

**Key design choice -- normalisation:** A landlord with only EPC data (worst_epc = G, scoring 28/28) gets normalised to 100. This is intentional: a landlord with an appalling EPC and no other data is still a strong lead. The threshold of 50+ then works consistently regardless of data coverage.

### Pattern 2: Snov.io API Integration
**What:** OAuth token flow, then batch email-by-name lookups (max 10 per request).
**When to use:** For enriching Ltd/LLP landlords with company domains.
**Example:**
```javascript
// Snov.io auth
async function getSnovToken() {
  const body = JSON.stringify({
    grant_type: 'client_credentials',
    client_id: process.env.SNOV_CLIENT_ID,
    client_secret: process.env.SNOV_CLIENT_SECRET,
  });
  // POST https://api.snov.io/v1/oauth/access_token
  // Returns { access_token, token_type, expires_in }
}

// Email finder by name + domain (up to 10 per batch)
// POST https://api.snov.io/v2/emails-by-domain-by-name/start
// Body: { rows: [{ first_name, last_name, domain }] }
// Returns: { task_hash }

// Then poll: GET https://api.snov.io/v2/emails-by-domain-by-name/result?task_hash=XXX
// Rate limit: 60 requests/minute
```

### Pattern 3: Companies House Officer Re-query
**What:** Re-fetch officer details for landlords with company_number to get director names + registered addresses.
**When to use:** Officers were logged but not stored in Phase 1 (see STATE.md decision).
**Example:**
```javascript
// Reuse existing companies-house.js getOfficers() function
// GET /company/{company_number}/officers
// Filter to active directors (no resigned_on)
// Extract: name, address (for direct mail), nationality
// Flag service addresses: check for keywords like 'Accountants', 'Services', 'Formations'
```

### Anti-Patterns to Avoid
- **Scoring based on record count across sources:** CONTEXT.md explicitly says "No multi-source adjustment." A landlord from one source with terrible EPC is still a good lead
- **Penalising missing data:** Missing void_days should contribute 0, not reduce score. Many landlords only appear in CCOD/EPC data which has no void information
- **Enriching all 9,545 landlords:** Snov.io credits are finite. Only enrich 50+ scored leads, expanding downward if budget allows
- **Using HubSpot API for initial load:** CSV import is faster, simpler, and avoids rate limit headaches for a one-time batch of 200-300 contacts

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email finding | Custom scraping/guessing | Snov.io API ($30/mo) | 98% accuracy, verification included, legal |
| CRM pipeline management | SQLite-based pipeline tracker | HubSpot free tier | UI for Sam, mobile access from Abu Dhabi, deal tracking |
| CSV generation | Manual string concatenation | csv-stringify (already in project) | Handles quoting, escaping, UTF-8 correctly |
| Rate limiting | Custom implementation for Snov.io | Adapt createRateLimiter from companies-house.js | Already battle-tested, 60 req/min config |
| Fuzzy name matching | Regex-based matching | Fuse.js (already in project) | Used in dedup, reusable for enrichment result matching |

**Key insight:** The scoring algorithm IS hand-built (no library for this), but enrichment and CRM use purpose-built tools. The scoring is domain-specific logic that must match Sam's business knowledge -- no library can do this.

## Common Pitfalls

### Pitfall 1: Score Inflation from Missing Data
**What goes wrong:** If missing signals are ignored (not counted toward max), landlords with only 1 strong signal get normalised to very high scores.
**Why it happens:** Normalisation to 0-100 means 28/28 (only EPC data, worst rating G) = score 100.
**How to avoid:** This is actually DESIRED per CONTEXT.md ("No multi-source adjustment"). But add a `data_signals_count` field so Sam can see how many signals contributed. A score of 85 with 4 signals is more trustworthy than 85 with 1 signal.
**Warning signs:** If the 50+ threshold produces too many leads (>500), tighten the threshold or add a minimum signals requirement.

### Pitfall 2: Snov.io Credit Burn on Bad Data
**What goes wrong:** Sending company names (not person names) to the email finder wastes credits returning nothing.
**Why it happens:** The landlords table has company names for Ltd/LLP entities, not director names. Snov.io email finder needs first_name + last_name + domain.
**How to avoid:** For Ltd/LLP landlords, query Companies House officers FIRST to get director names. Then use director name + company website domain for Snov.io lookup. For individual landlords, use their name directly.
**Warning signs:** Low email find rate (<20%) on first batch.

### Pitfall 3: HubSpot Custom Property Creation Before Import
**What goes wrong:** CSV import fails silently or maps to wrong fields if custom properties do not already exist in HubSpot.
**Why it happens:** HubSpot does not auto-create custom properties from CSV headers. They must be manually created first.
**How to avoid:** Document exact property names and types. Create them in HubSpot UI BEFORE running the CSV import. The free tier allows up to 10 custom properties.
**Warning signs:** Import report shows unmapped columns.

### Pitfall 4: EPC Data Not Linked to Landlords
**What goes wrong:** EPC ratings exist on properties table but many properties lack a landlord_id (10,677 properties have NULL landlord_id).
**Why it happens:** EPC data was imported with property addresses but landlord matching was deferred (see STATE.md: "EPC-landlord linking deferred to Phase 3").
**How to avoid:** Before scoring, run an address-matching step to link EPC properties to landlords where possible. This gives many more landlords an EPC signal.
**Warning signs:** Very few landlords (only those with OpenRent/Rightmove properties) have EPC ratings contributing to their score.

### Pitfall 5: HubSpot Date Format
**What goes wrong:** Follow-up task dates import incorrectly.
**Why it happens:** HubSpot expects dates in `YYYY-MM-DD` or Unix timestamp (milliseconds) format. Other formats (DD/MM/YYYY, etc.) cause silent mapping failures.
**How to avoid:** Always use ISO format `YYYY-MM-DD` in CSV exports. Use `new Date().toISOString().split('T')[0]` pattern already established in the project.

## Code Examples

### Database Migration for New Columns
```javascript
// Idempotent migration pattern (from STATE.md decisions)
const migrations = [
  'ALTER TABLE landlords ADD COLUMN tired_score INTEGER',
  'ALTER TABLE landlords ADD COLUMN btl_suitable INTEGER DEFAULT 0',
  'ALTER TABLE landlords ADD COLUMN r2r_suitable INTEGER DEFAULT 0',
  'ALTER TABLE landlords ADD COLUMN data_signals_count INTEGER DEFAULT 0',
  'ALTER TABLE landlords ADD COLUMN email TEXT',
  'ALTER TABLE landlords ADD COLUMN phone TEXT',
  'ALTER TABLE landlords ADD COLUMN linkedin_url TEXT',
  'ALTER TABLE landlords ADD COLUMN mailing_address TEXT',
  'ALTER TABLE landlords ADD COLUMN enrichment_source TEXT',
  'ALTER TABLE landlords ADD COLUMN enrichment_date TEXT',
  'ALTER TABLE landlords ADD COLUMN director_names TEXT',
];

for (const sql of migrations) {
  try { db.exec(sql); } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }
}
```

### HubSpot CSV Export Format
```javascript
// HubSpot expects specific column headers matching property internal names
const hubspotRow = {
  'First Name': directorFirstName || '',
  'Last Name': directorLastName || '',
  'Email': landlord.email || '',
  'Phone Number': landlord.phone || '',
  'Company Name': landlord.name,
  // Custom properties (must be created in HubSpot first)
  'tired_landlord_score': landlord.tired_score,
  'btl_suitable': landlord.btl_suitable ? 'Yes' : 'No',
  'r2r_suitable': landlord.r2r_suitable ? 'Yes' : 'No',
  'entity_type': landlord.entity_type,
  'property_count': landlord.property_count,
  'data_sources': landlord.source,
  'epc_rating': landlord.worst_epc || '',
  'void_days': landlord.max_void_days || '',
};
```

### Service Address Detection Heuristic
```javascript
const SERVICE_ADDRESS_KEYWORDS = [
  'accountant', 'accounting', 'formations', 'services ltd',
  'registered office', 'virtual office', 'mail box', 'mailbox',
  'business centre', 'business center', 'serviced office',
  'company secretar', 'nominees', 'agents',
];

function isServiceAddress(address) {
  if (!address) return false;
  const lower = address.toLowerCase();
  return SERVICE_ADDRESS_KEYWORDS.some(kw => lower.includes(kw));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HubSpot free had unlimited contacts | Free tier now 1,000 marketing contacts (CRM contacts still unlimited) | Sept 2024 | Our CRM contacts (not marketing) remain unlimited |
| Snov.io v1 API | Snov.io v2 API with async task_hash pattern | 2024 | Must use start/result pattern, not synchronous lookups |
| HubSpot workflow automation on free | No workflow automation on free tier | 2024 | Follow-up tasks must be script-generated, not HubSpot-triggered |

## Data Landscape (Critical for Planning)

Understanding the actual data distribution is essential for realistic scoring:

| Signal | Records Available | Coverage | Notes |
|--------|-------------------|----------|-------|
| EPC rating (D-G) | 9,639 properties | ~24% of properties | 7,858 D + 1,617 E + 118 F + 46 G. But 10,677 properties have no landlord_id |
| Void days | 1,110 properties | ~2.7% of properties | 718 under 30d, 154 at 30-59d, 49 at 60-89d, 189 at 90+ days |
| Listing quality score | 1,000 properties | ~2.5% of properties | 0-100 scale, from OpenRent/Rightmove scraping |
| Self-managing status | 110 landlords | 1.2% of landlords | All from OpenRent, all marked self-managing |
| HMO licence | 2,103 landlords | 22% of landlords | From HMO register source, for R2R classification |
| Company number | 547 landlords | 5.7% of landlords | 465 Ltd + 82 LLP. Enables CH officer lookup |
| Entity type known | 657 landlords | 6.9% of landlords | 110 individual + 465 Ltd + 82 LLP. Rest = unknown |

**Implication:** Most landlords (8,888 "unknown" entity type, mostly from CCOD bulk import) will score primarily on EPC data IF the EPC-landlord linking step is completed. Without that linking step, the vast majority of landlords will have NO scoreable signals and the 50+ threshold will produce very few leads.

## Open Questions

1. **EPC-landlord linking strategy**
   - What we know: 10,677 properties have EPC data but no landlord_id. Landlords table has registered addresses. Properties have full addresses.
   - What is unclear: How to match EPC properties to CCOD/CH landlords. Address normalisation is hard. UPRN matching would be ideal but CCOD does not include UPRNs reliably.
   - Recommendation: Use postcode + address fuzzy matching (Fuse.js already in project). This is a prerequisite step before scoring can be meaningful for the majority of landlords.

2. **Snov.io domain lookup for Ltd companies**
   - What we know: Snov.io email finder needs first_name + last_name + domain. We have company names and numbers.
   - What is unclear: How to find company website domains. Companies House does not store websites. Could use Snov.io domain search by company name, but this uses credits too.
   - Recommendation: For Ltd/LLP landlords, try Snov.io's company domain search first, then use director names with found domains for email lookup. Budget for 2 credits per company (domain + email).

3. **Vibe Prospecting MCP availability**
   - What we know: CONTEXT.md mentions it as secondary enrichment tool after Snov.io.
   - What is unclear: Whether this MCP is installed, configured, or what its capabilities are.
   - Recommendation: Plan Snov.io as primary path. Vibe Prospecting as optional enhancement if available.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in assert + better-sqlite3 temp DB |
| Config file | None -- follows existing test pattern (temp DB in os.tmpdir()) |
| Quick run command | `node scripts/test-scoring.js` |
| Full suite command | `node scripts/test-scoring.js && node scripts/test-enrichment.js` |

### Phase Requirements to Test Map
| Req ID | Behaviour | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTEL-02 | Scoring produces 0-100 for various signal combinations | unit | `node scripts/test-scoring.js` | No -- Wave 0 |
| INTEL-03 | BTL classification: score 50+ and not exclusively HMO | unit | `node scripts/test-scoring.js` | No -- Wave 0 |
| INTEL-04 | R2R classification: has HMO licence = R2R eligible | unit | `node scripts/test-scoring.js` | No -- Wave 0 |
| INTEL-05 | Enrichment writes email/phone/linkedin to landlords table | integration | `node scripts/test-enrichment.js` | No -- Wave 0 |
| CRM-01 | HubSpot pipeline setup | manual-only | Manual -- verify in HubSpot UI | n/a |
| CRM-02 | CSV export matches HubSpot import format | unit | `node scripts/test-hubspot-export.js` | No -- Wave 0 |
| CRM-03 | Follow-up dates calculated correctly in export | unit | `node scripts/test-hubspot-export.js` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `node scripts/test-scoring.js`
- **Per wave merge:** Full suite: scoring + enrichment + export tests
- **Phase gate:** Full suite green before verify-work

### Wave 0 Gaps
- [ ] `scripts/test-scoring.js` -- covers INTEL-02, INTEL-03, INTEL-04
- [ ] `scripts/test-enrichment.js` -- covers INTEL-05 (mock API calls)
- [ ] `scripts/test-hubspot-export.js` -- covers CRM-02, CRM-03
- [ ] `scripts/lib/scoring.js` -- pure scoring functions extracted for testability

## Sources

### Primary (HIGH confidence)
- SQLite database direct inspection -- schema, record counts, data distributions (verified via queries)
- Existing codebase -- scripts/build-lead-list.js, scripts/companies-house.js, scripts/lib/db.js patterns
- CONTEXT.md -- all user decisions locked and documented

### Secondary (MEDIUM confidence)
- [Snov.io API docs](https://snov.io/api) -- v2 endpoints, auth flow, rate limits (60 req/min), credit costs
- [HubSpot import format](https://knowledge.hubspot.com/import-and-export/set-up-your-import-file) -- CSV requirements, custom property creation
- [HubSpot free CRM limitations](https://zeeg.me/en/blog/post/hubspot-free-crm-limitations) -- 1 pipeline, no workflows, 10 custom properties
- [HubSpot APIs by tier](https://developers.hubspot.com/apisbytier) -- API access on free tier confirmed
- [HubSpot Node.js client](https://github.com/HubSpot/hubspot-api-nodejs) -- v13.5.0, though CSV import preferred over API for v1

### Tertiary (LOW confidence)
- HubSpot contact limits on free tier -- conflicting sources (some say 1,000 contacts post-Sept 2024, others say 1M CRM contacts). Likely 1M CRM + 1,000 marketing contacts distinction. Verify during HubSpot account setup.
- Vibe Prospecting MCP -- capabilities unknown, not verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- follows established patterns from Phase 1-2, scoring logic is straightforward
- Pitfalls: HIGH -- data distribution directly verified via SQLite queries, EPC linking gap confirmed
- Enrichment APIs: MEDIUM -- Snov.io v2 API docs verified but no hands-on testing yet
- HubSpot free tier limits: MEDIUM -- multiple sources with minor conflicts on contact limits

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable domain, APIs unlikely to change in 30 days)

---
*Phase: 03-lead-scoring-crm*
*Research completed: 2026-03-29*
