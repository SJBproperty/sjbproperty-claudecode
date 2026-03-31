# Phase 4: Compliance & Outreach Infrastructure - Research

**Researched:** 2026-03-31
**Domain:** UK GDPR/PECR compliance documentation, suppression list enforcement, export pipeline safeguards
**Confidence:** HIGH

## Summary

Phase 4 is primarily a documentation and pipeline safeguard phase, not a heavy coding phase. The deliverables are: (1) a Legitimate Interest Assessment document following the ICO's standard three-part test template, (2) a privacy notice and data retention policy, (3) database migration adding suppression columns to the landlords table, and (4) pre-export filtering in `build-lead-list.js` enforcing both suppression checks and the PECR entity type gate (email only to Ltd/LLP).

The legal landscape is straightforward for this use case. The UK Data (Use and Access) Act 2025 (in force from February 2026) explicitly confirms direct marketing as a legitimate interest under UK GDPR Article 6(1)(f), though the full three-part LIA (purpose, necessity, balancing) is still required. PECR rules are clear: Ltd and LLP companies are "corporate subscribers" and can receive unsolicited marketing emails with an opt-out mechanism. Sole traders are "individual subscribers" requiring prior consent -- so they must be excluded from email outreach entirely, which the entity type gate already handles.

Email sending infrastructure (secondary domains, Zoho Mail, Instantly.ai warmup) is deferred per user decision -- only 3 email leads exist. This phase focuses on getting the legal foundation right and making the export pipeline compliance-safe before any outreach begins in Phases 5-6.

**Primary recommendation:** Follow the ICO's LIA template exactly (three-part test), create markdown compliance docs in `docs/compliance/`, and add suppression + PECR gate as pre-export filters in the existing `build-lead-list.js` pipeline.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Legitimate Interest Assessment:** ICO's standard LIA template, filled in with SJB-specific details -- data sources (EPC Register, Companies House, HMO registers, Land Registry CCOD, OpenRent), processing purposes (B2B landlord marketing for property management services), balancing test. Template-based, not solicitor-reviewed
- **Privacy notice and data retention policy:** Markdown files in `docs/compliance/` folder in repo, version-controlled. Copy to sjbpropertygroup.com when ready. Published URL linkable in outreach materials
- **Data retention period:** 12 months from collection, then review -- delete if no engagement. Standard for B2B prospecting
- **Opt-out mechanism:** "Reply STOP to opt out" for email channel. No unsubscribe link infrastructure needed. Instantly.ai handles reply detection natively. Direct mail includes reply address for opt-out
- **Suppression list storage:** Database columns on landlords table -- `suppressed` (boolean), `suppressed_date`, `suppressed_reason`. Consistent with Phase 3's flat-table approach
- **Suppression scope:** Universal suppression -- if someone opts out via any channel, suppress across ALL channels (email, mail, phone, LinkedIn)
- **Suppression enforcement:** Pre-export filter -- export scripts check `suppressed` flag before including any lead in outreach lists
- **PECR entity type gate:** Export script hard-filters to `entity_type = 'Ltd'` or `'LLP'` for any email outreach list. Sole traders and individuals only appear in direct mail and phone exports
- **ICO registration:** Already current -- no action needed this phase

### Claude's Discretion
- LIA template formatting and exact wording (within ICO framework)
- Privacy notice structure and legal phrasing
- Migration script approach for new suppression columns
- Whether to create a shared export utility or add suppression/PECR checks to existing export scripts

### Deferred Ideas (OUT OF SCOPE)
- Email sending infrastructure -- Secondary domains, Zoho Mail, Instantly.ai warmup. Revisit when 50+ email leads available
- Unsubscribe link on website -- Build a web endpoint for opt-outs if/when email volume justifies it
- Bulk suppression import -- CSV import script for purchased suppression lists or bulk opt-outs. Build when needed
- n8n follow-up automation -- Deferred from Phase 3 for automated CRM reminders
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-01 | GDPR Legitimate Interest Assessment (LIA) documentation for B2B landlord marketing | ICO three-part test template (purpose, necessity, balancing); UK DUA Act 2025 confirms direct marketing as legitimate interest; LIA structure and required questions documented below |
| COMP-02 | PECR compliance enforcement -- entity type gate: email outreach ONLY to Ltd/LLP landlords; sole traders receive direct mail/phone only | PECR corporate subscriber rules verified; entity_type column already exists on landlords table; export script filtering pattern documented |
| COMP-03 | Privacy notice and data retention policy for landlord lead data | Articles 13/14 UK GDPR requirements for privacy notices documented; data retention policy structure with 12-month review cycle |
| COMP-04 | Suppression list -- opt-out tracking to prevent re-contacting landlords who decline | Migration pattern from Phase 3 available; suppression columns and pre-export filter approach documented |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.8.0 | Database operations for suppression columns | Already in project, synchronous API matches existing patterns |
| Node.js built-in `node:test` | N/A | Test runner | Already used across all prior phases |
| Node.js built-in `node:assert/strict` | N/A | Test assertions | Already used across all prior phases |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| csv-stringify | 6.7.0 | CSV export with suppression/PECR filtering | Already installed, used in build-lead-list.js |

### No New Dependencies
This phase requires zero new npm packages. All work is: (1) markdown document creation, (2) SQLite ALTER TABLE migration, (3) WHERE clause additions to existing export queries.

## Architecture Patterns

### Recommended Project Structure
```
docs/
  compliance/
    legitimate-interest-assessment.md    # COMP-01: LIA document
    privacy-notice.md                    # COMP-03: Privacy notice
    data-retention-policy.md             # COMP-03: Retention policy
scripts/
  migrate-phase4.js                      # COMP-04: Add suppression columns
  suppress-lead.js                       # COMP-04: CLI to suppress individual leads
  build-lead-list.js                     # COMP-02/04: Modify existing -- add filters
  export-notion.js                       # COMP-04: Modify existing -- exclude suppressed
  tests/
    test-suppression.js                  # Tests for migration + filtering
```

### Pattern 1: Idempotent Migration (from Phase 3)
**What:** ALTER TABLE with try/catch on "duplicate column name"
**When to use:** Adding new columns to landlords table
**Example:**
```javascript
// Source: scripts/migrate-phase3.js (established project pattern)
const MIGRATIONS = [
  'ALTER TABLE landlords ADD COLUMN suppressed INTEGER DEFAULT 0',
  'ALTER TABLE landlords ADD COLUMN suppressed_date TEXT',
  'ALTER TABLE landlords ADD COLUMN suppressed_reason TEXT',
];

function runMigration(db) {
  for (const sql of MIGRATIONS) {
    try {
      db.exec(sql);
    } catch (err) {
      if (err.message && err.message.includes('duplicate column name')) {
        continue;
      }
      throw err;
    }
  }
}
```

### Pattern 2: Pre-Export Filtering
**What:** Add WHERE clauses to existing export queries to exclude suppressed leads and enforce PECR entity gate
**When to use:** Every export that produces outreach lists
**Example:**
```javascript
// Suppression filter -- add to ALL export queries
WHERE suppressed = 0 OR suppressed IS NULL

// PECR entity gate -- add ONLY to email export queries
AND entity_type IN ('ltd', 'llp')
```

### Pattern 3: Compliance Documentation as Markdown
**What:** Version-controlled markdown files in `docs/compliance/` that can be served on the website later
**When to use:** Any legal/compliance document that needs versioning and eventual public hosting
**Why:** Markdown is diffable, version-controlled, and trivially convertible to HTML for website publishing

### Anti-Patterns to Avoid
- **Separate suppression table:** CONTEXT.md explicitly locks suppression as columns on the landlords table, consistent with the flat-table approach used throughout the project. Do not create a separate suppression_list table.
- **Conditional suppression by channel:** User decided universal suppression -- if suppressed on one channel, suppressed on ALL. Do not implement per-channel suppression flags.
- **Over-engineering the suppression CLI:** Start with a simple `suppress-lead.js` that takes a landlord ID. No bulk import needed yet.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LIA document structure | Custom compliance framework | ICO's official LIA template (three-part test) | ICO auditors expect their own format; deviation adds risk |
| Privacy notice wording | Bespoke legal language | ICO's "What privacy information should we provide?" guidance as a checklist | Articles 13/14 specify exact required elements |
| PECR entity classification | Custom entity type logic | Existing `entity_type` column from Phase 1 (`ltd`, `llp`, `individual`, `unknown`) | Already classified during data ingestion |

**Key insight:** The compliance documents should follow ICO templates and guidance closely. The value is in filling them in accurately with SJB-specific details, not inventing new formats.

## Common Pitfalls

### Pitfall 1: Confusing GDPR Lawful Basis with PECR Rules
**What goes wrong:** Assuming that a valid Legitimate Interest under GDPR automatically allows email marketing to anyone
**Why it happens:** GDPR and PECR are separate legal frameworks that both apply simultaneously
**How to avoid:** GDPR (LIA) covers the lawful basis for processing personal data. PECR separately requires consent for email to individual subscribers (sole traders). Both must be satisfied. The entity type gate enforces the PECR layer.
**Warning signs:** Any export script that sends email to `entity_type = 'individual'` or `'unknown'`

### Pitfall 2: Treating "Unknown" Entity Type as Corporate
**What goes wrong:** Landlords with `entity_type = 'unknown'` get included in email exports
**Why it happens:** Optimistic assumption that unknown = probably a company
**How to avoid:** The PECR gate must use a whitelist approach: ONLY `'ltd'` and `'llp'` pass. Everything else (including `'unknown'`) is excluded from email. Unknown entity types can still receive direct mail to the property address.
**Warning signs:** Email export count higher than the count of ltd + llp landlords

### Pitfall 3: Forgetting to Add Suppression Check to Future Export Scripts
**What goes wrong:** New export scripts (e.g., Stannp CSV export in Phase 5) don't include suppression filtering
**Why it happens:** No centralised export function; each script builds its own SQL
**How to avoid:** Either (a) create a shared `getExportableLeads()` function that includes suppression + PECR checks, or (b) add clear comments in each export script. Option (a) is recommended -- Claude's discretion area.
**Warning signs:** Multiple export scripts with duplicated WHERE clauses

### Pitfall 4: Not Including "Sources of Data" in Privacy Notice
**What goes wrong:** Privacy notice omits where the data came from, which is required under Article 14 (data not obtained directly from the data subject)
**Why it happens:** Most privacy notice templates assume direct data collection
**How to avoid:** Article 14 specifically requires listing the sources. For SJB: EPC Register (public), Companies House (public), HMO licensing registers (FOI/public), Land Registry CCOD (public), OpenRent (public listings)
**Warning signs:** Privacy notice that only says "we collect your data" without specifying sources

### Pitfall 5: Suppression Not Syncing to Notion CRM
**What goes wrong:** A lead is suppressed in SQLite but still shows as "New" in Notion CRM, leading to accidental contact
**Why it happens:** SQLite suppression and Notion CRM are separate systems with no automatic sync
**How to avoid:** The `export-notion.js` script should either exclude suppressed leads or mark them with a "Suppressed" status in Notion. At minimum, add suppression check to the Notion export query.

## Code Examples

### Migration Script Pattern
```javascript
// Source: Adapted from scripts/migrate-phase3.js
const MIGRATIONS = [
  'ALTER TABLE landlords ADD COLUMN suppressed INTEGER DEFAULT 0',
  'ALTER TABLE landlords ADD COLUMN suppressed_date TEXT',
  'ALTER TABLE landlords ADD COLUMN suppressed_reason TEXT',
];

function runMigration(db) {
  for (const sql of MIGRATIONS) {
    try {
      db.exec(sql);
    } catch (err) {
      if (err.message && err.message.includes('duplicate column name')) continue;
      throw err;
    }
  }
}
```

### Suppression CLI Pattern
```javascript
// scripts/suppress-lead.js
// Usage: node scripts/suppress-lead.js --id 1234 --reason "Replied STOP"
function suppressLead(db, landlordId, reason) {
  const stmt = db.prepare(`
    UPDATE landlords SET
      suppressed = 1,
      suppressed_date = datetime('now'),
      suppressed_reason = ?
    WHERE id = ?
  `);
  const result = stmt.run(reason, landlordId);
  return result.changes;
}
```

### Export Query with Suppression + PECR Gate
```javascript
// For email exports: suppression + PECR entity gate
const emailLeads = db.prepare(`
  SELECT l.*, ...
  FROM landlords l
  WHERE (l.match_group_id IS NULL OR l.is_primary_record = 1)
    AND (l.suppressed = 0 OR l.suppressed IS NULL)
    AND l.entity_type IN ('ltd', 'llp')
  ...
`).all();

// For direct mail exports: suppression only (all entity types allowed)
const mailLeads = db.prepare(`
  SELECT l.*, ...
  FROM landlords l
  WHERE (l.match_group_id IS NULL OR l.is_primary_record = 1)
    AND (l.suppressed = 0 OR l.suppressed IS NULL)
  ...
`).all();
```

### LIA Document Structure (ICO Three-Part Test)
```markdown
# Legitimate Interest Assessment — SJB Property Group Ltd

## Part 1: Purpose Test
- What is the legitimate interest? B2B marketing of property management services
- Who benefits? Both SJB (business development) and landlords (professional management)
- Is the interest real and present? Yes — active landlord pipeline with 9,545 records

## Part 2: Necessity Test
- Is processing necessary for this purpose? Yes — cannot market without contact data
- Is there a less intrusive way? No — property addresses are public, used for direct mail
- What data is minimally required? Name, entity type, property address, email (if corporate)

## Part 3: Balancing Test
- Nature of data: Business contact info from public sources (EPC, CH, CCOD)
- Reasonable expectations: Landlords of rental properties expect business correspondence
- Safeguards: Opt-out mechanism, suppression list, 12-month retention review
- Impact on individuals: Low — B2B context, easy opt-out, no sensitive data
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full LIA always required for marketing | DUA Act 2025 confirms direct marketing as legitimate interest (purpose test easier to pass) | February 2026 | Stronger legal footing, but necessity + balancing tests still required |
| PECR entity rules unclear for LLPs | ICO guidance confirms LLPs are corporate subscribers | Current ICO guidance | LLPs can receive unsolicited marketing email like Ltd companies |
| Separate consent tracking system | Flat-table suppression on landlords table | Project decision | Simpler, consistent with existing schema pattern |

## Open Questions

1. **Shared export utility vs. per-script filtering**
   - What we know: Currently each export script (`build-lead-list.js`, `export-notion.js`) has its own SQL queries
   - What's unclear: Whether to create a shared `getExportableLeads(db, { channel })` function or add WHERE clauses to each script
   - Recommendation: Create a shared utility in `scripts/lib/export-filters.js` that returns base WHERE clause fragments. This prevents future export scripts from forgetting suppression/PECR checks. This is Claude's discretion per CONTEXT.md.

2. **Notion CRM suppression sync**
   - What we know: Suppression happens in SQLite. Notion has its own "Status" field.
   - What's unclear: Whether to update existing Notion pages when a lead is suppressed, or just exclude suppressed leads from future exports
   - Recommendation: For now, exclude suppressed leads from `export-notion.js` queries. Updating existing Notion pages adds complexity and API calls. Manual status change in Notion is sufficient at this scale.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` + `node:assert/strict` |
| Config file | None -- tests run directly via `node scripts/tests/test-*.js` |
| Quick run command | `node scripts/tests/test-suppression.js` |
| Full suite command | `for f in scripts/tests/test-*.js; do node "$f"; done` |

### Phase Requirements to Test Map
| Req ID | Behaviour | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | LIA document exists and contains required sections | manual | N/A -- document review | N/A |
| COMP-02 | Email export excludes non-Ltd/LLP entity types | unit | `node scripts/tests/test-suppression.js` | Wave 0 |
| COMP-02 | Email export excludes unknown entity types | unit | `node scripts/tests/test-suppression.js` | Wave 0 |
| COMP-03 | Privacy notice exists with Article 13/14 required fields | manual | N/A -- document review | N/A |
| COMP-04 | Migration adds suppressed, suppressed_date, suppressed_reason columns | unit | `node scripts/tests/test-suppression.js` | Wave 0 |
| COMP-04 | Suppressed leads excluded from all exports | unit | `node scripts/tests/test-suppression.js` | Wave 0 |
| COMP-04 | suppress-lead.js sets correct flags | unit | `node scripts/tests/test-suppression.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node scripts/tests/test-suppression.js`
- **Per wave merge:** `for f in scripts/tests/test-*.js; do node "$f"; done`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/tests/test-suppression.js` -- covers COMP-02, COMP-04 (migration, filtering, suppress CLI)
- [ ] Test DB helper needs suppression columns in createTestDb() for future tests

## Sources

### Primary (HIGH confidence)
- [ICO Legitimate Interests guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/) -- Three-part test structure, LIA requirements
- [ICO LIA template](https://ico.org.uk/media2/for-organisations/forms/2258435/gdpr-guidance-legitimate-interests-sample-lia-template.docx) -- Official downloadable template
- [ICO B2B marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/) -- PECR corporate vs individual subscriber rules
- [ICO privacy information guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) -- Articles 13/14 requirements
- [ICO electronic mail marketing](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/) -- PECR email rules for corporate subscribers
- Existing codebase: `scripts/migrate-phase3.js`, `scripts/build-lead-list.js`, `scripts/export-notion.js` -- established patterns

### Secondary (MEDIUM confidence)
- [UK Data (Use and Access) Act 2025 -- ICO summary](https://ico.org.uk/about-the-ico/what-we-do/legislation-we-covered/data-use-and-access-act-2025/the-data-use-and-access-act-2025-what-does-it-mean-for-organisations/) -- DUA Act changes confirmed direct marketing as legitimate interest
- [Clifford Chance on recognised legitimate interests](https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2025/09/uk-ico-s-recognised-legitimate-interest-guidance-.html) -- Full LIA still required for direct marketing (not on "recognised" list)
- [Harper James on DUA Act and legitimate interest](https://harperjames.co.uk/article/legitimate-interest-and-the-data-use-and-access-act/) -- Confirms direct marketing is explicitly listed but balancing test still needed
- [SmartSMSSolutions B2B vs B2C rules](https://smartsmssolutions.com/resources/blog/uk/b2b-b2c-email-marketing-rules-uk) -- PECR sole trader rules verified

### Tertiary (LOW confidence)
- None -- all findings verified against ICO official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, reusing existing project patterns
- Architecture: HIGH -- migration and export patterns well-established from Phases 1-3
- Pitfalls: HIGH -- PECR/GDPR rules verified against ICO official guidance
- Legal compliance: MEDIUM -- ICO templates followed but not solicitor-reviewed (per user decision)

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (stable -- UK GDPR/PECR rules not changing soon; DUA Act provisions already in force)
