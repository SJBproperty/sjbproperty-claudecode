# Phase 5: BTL Management Campaign - Research

**Researched:** 2026-04-01
**Domain:** Direct mail API integration, outreach content creation, multi-channel campaign assets
**Confidence:** HIGH

## Summary

Phase 5 is primarily a content creation and export pipeline phase. The core technical work is a Stannp-compatible CSV export script that pulls scored, enriched landlord data from the existing SQLite database, applies suppression and address selection logic, and outputs a file ready for Stannp's bulk import. The remaining deliverables are markdown-based content assets: phone script, LinkedIn templates, and email sequences.

The Stannp API uses a Group -> Recipients -> Campaign workflow. For a batch of 20-30 leads, the simplest integration is a CSV export script that produces a file uploadable via Stannp's `/recipients/import` endpoint or manually through the dashboard. The merge field syntax uses `{field_name}` curly braces in templates. The UK API base URL is `https://api-eu1.stannp.com/v1/`.

**Primary recommendation:** Build a dedicated `scripts/export-stannp.js` that reuses `export-filters.js`, queries top-scored BTL leads with address data, and outputs a Stannp-formatted CSV. Store all outreach content (phone script, LinkedIn templates, email sequences) as versioned markdown in `docs/outreach/`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Existing 3-page professionally designed booklet is the template -- not a plain text letter
- Combined pitch: Option A (Guaranteed Rent) + Option B (Fully Managed 10% fee)
- Guaranteed rent qualifier small print: "Guaranteed rent available for qualifying multi-occupancy properties"
- Full personalisation via Stannp merge fields: landlord name, property address, EPC rating, portfolio size
- Opening personalised: "Dear [Name]" not "Dear Landlord", reference specific property and EPC rating
- Prioritise leads with owner address; fallback to property address
- Direct mail first and only active channel for initial batch (20-30 leads)
- Email as secondary for 3 Ltd/LLP leads only (PECR gate)
- Phone and LinkedIn are asset-only this phase -- no contact data available
- Phone script: warm follow-up referencing the letter
- LinkedIn templates: connection request references their company/property
- Email: 3 emails over 2 weeks (EPC hook, social proof, CTA)
- Stannp CSV with merge fields: name, address_line_1, address_line_2, city, postcode, epc_rating, property_count, property_address
- Suppression list checked before export via existing export-filters.js

### Claude's Discretion
- Exact phone script structure and flow
- LinkedIn DM sequence length and content
- Email subject lines and exact copy
- Stannp CSV column mapping specifics
- Whether to create a dedicated Stannp export script or extend build-lead-list.js

### Deferred Ideas (OUT OF SCOPE)
- Instantly.ai setup and domain warmup (only 3 email leads)
- Phone/LinkedIn contact enrichment (manual lookup deferred)
- A/B testing different letter versions
- Response tracking dashboard
- n8n follow-up automation
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUT-BTL-01 | Direct mail templates -- professional letter pitching BTL management | Stannp API integration research, merge field syntax `{field}`, CSV export pipeline pattern, address field mapping |
| OUT-BTL-02 | Email sequences via Instantly.ai -- cold email to Ltd/LLP landlords ONLY | PECR gate via `pecrEmailGate()` in export-filters.js, 3-email sequence content, Ltd/LLP entity filter |
| OUT-BTL-03 | Phone scripts -- prepared BTL management conversation script | Content asset only, warm follow-up structure referencing letter |
| OUT-BTL-04 | LinkedIn/social outreach -- connection request templates and DM sequences | Content asset only, connection request + follow-up DM sequence |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | (existing) | Database queries for lead export | Already in project, all data access uses it |
| csv-stringify/sync | (existing) | CSV generation | Already used in build-lead-list.js |
| dotenv | (existing) | Environment variable loading | Stannp API key stored in .env |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Stannp API | v1 | Direct mail dispatch | CSV upload via dashboard or API `/recipients/import` endpoint |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stannp CSV export | Stannp API direct send | CSV export + dashboard upload is simpler for 20-30 leads; API direct send adds complexity for no benefit at this scale |
| Dedicated export script | Extending build-lead-list.js | Dedicated script is cleaner; build-lead-list.js already has 5 exports and dedup logic mixed in |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
# Only addition: STANNP_API_KEY in .env file
```

## Architecture Patterns

### Recommended Project Structure
```
scripts/
  export-stannp.js          # New: Stannp-format CSV export for direct mail
  lib/
    export-filters.js        # Existing: suppressionFilter(), pecrEmailGate(), getFilteredLeads()
    db.js                    # Existing: SQLite connection
    config.js                # Existing: paths, postcodes
docs/
  outreach/
    btl-phone-script.md      # New: Phone conversation script
    btl-linkedin-templates.md # New: Connection request + DM sequence
    btl-email-sequences.md   # New: 3-email sequence for Ltd/LLP leads
  compliance/
    privacy-notice.md         # Existing: Article 14 notice (link in outreach materials)
data/
  exports/
    stannp-btl-YYYY-MM-DD.csv # Generated: Stannp-ready CSV
```

### Pattern 1: Stannp CSV Export Script
**What:** Dedicated export script following the same pattern as `build-lead-list.js`
**When to use:** When generating the Stannp-compatible CSV for direct mail batch

The script must:
1. Query landlords table with suppression filter
2. Join properties for EPC ratings and property addresses
3. Select mailing address (owner_address preferred, mailing_address fallback, then property address)
4. Format output columns to match Stannp's expected fields
5. Output date-stamped CSV to `data/exports/`

**Example:**
```javascript
// Pattern from existing build-lead-list.js + export-filters.js
const { suppressionFilter, getFilteredLeads } = require('./lib/export-filters');
const { stringify } = require('csv-stringify/sync');

// Query: top-scored BTL leads with address data
const rows = db.prepare(`
  SELECT l.id, l.name, l.entity_type, l.owner_address, l.mailing_address,
    l.tired_score, l.btl_suitable,
    GROUP_CONCAT(DISTINCT p.address) as property_addresses,
    GROUP_CONCAT(DISTINCT p.current_energy_rating) as epc_ratings,
    COUNT(DISTINCT p.id) as property_count,
    MIN(p.address) as first_property_address,
    MIN(p.postcode) as first_property_postcode,
    MIN(p.current_energy_rating) as worst_epc
  FROM landlords l
  LEFT JOIN properties p ON p.landlord_id = l.id
  WHERE (l.match_group_id IS NULL OR l.is_primary_record = 1)
    AND ${suppressionFilter()}
    AND l.btl_suitable = 1
  GROUP BY l.id
  ORDER BY l.tired_score DESC
  LIMIT ?
`).all(batchSize);
```

### Pattern 2: Address Selection Logic
**What:** Waterfall logic for choosing the best mailing address
**When to use:** In the Stannp export script

```javascript
// Address priority: owner_address > mailing_address > property address
function selectMailingAddress(lead) {
  if (lead.owner_address) return parseAddress(lead.owner_address);
  if (lead.mailing_address) return parseAddress(lead.mailing_address);
  // Fallback: property address (may reach tenant, acceptable trade-off)
  return parseAddress(lead.first_property_address + ', ' + lead.first_property_postcode);
}
```

### Pattern 3: Stannp CSV Column Mapping
**What:** Map database fields to Stannp recipient fields
**When to use:** CSV output formatting

Stannp expects these standard fields:
- `title`, `firstname`, `lastname`, `company`
- `address1`, `address2`, `address3`, `city`, `county`, `postcode`, `country`
- Custom merge fields: any additional columns become `{column_name}` in templates

```javascript
// Map to Stannp format with custom merge fields
const csvRow = {
  'title': '',
  'firstname': firstName,
  'lastname': lastName,
  'company': lead.entity_type === 'ltd' || lead.entity_type === 'llp' ? lead.name : '',
  'address1': address.line1,
  'address2': address.line2 || '',
  'city': address.city,
  'postcode': address.postcode,
  'country': 'GB',
  // Custom merge fields for booklet personalisation
  'epc_rating': lead.worst_epc || '',
  'property_count': lead.property_count,
  'property_address': lead.first_property_address || '',
};
```

### Pattern 4: Outreach Content as Markdown
**What:** Store all campaign content as version-controlled markdown files
**When to use:** Phone scripts, LinkedIn templates, email sequences

Benefits: diffable in git, easily reviewed, can be converted to other formats. Each file is a standalone asset with clear structure.

### Anti-Patterns to Avoid
- **Mixing Stannp export into build-lead-list.js:** The existing script handles deduplication + 5 CSV exports. Adding Stannp-specific logic would make it unwieldy. Use a dedicated script.
- **Hardcoding merge field content in the export script:** The booklet design (external PDF) contains the merge field placeholders `{firstname}`, `{epc_rating}`, etc. The export script only produces the data CSV, not the letter content.
- **Sending to suppressed leads:** Every export MUST use `suppressionFilter()` from the shared library. No exceptions.
- **Sending email to non-Ltd/LLP entities:** The PECR gate is already enforced in `export-filters.js` but must be explicitly applied to any email export.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Address parsing | Custom UK address parser | Simple line-splitting of existing stored addresses | Addresses are already structured in the DB; complex parsing adds no value |
| Direct mail dispatch | Custom HTTP client for Stannp | Stannp dashboard CSV upload | For 20-30 leads, manual upload is simpler and allows visual QA of the merge before sending |
| Email sending | Custom SMTP sender | Instantly.ai (deferred) | Only 3 email leads; manual send acceptable; Instantly.ai deferred until 50+ leads |
| Suppression logic | Per-script suppression checks | Shared `export-filters.js` | Already built and tested; reuse prevents bugs |

**Key insight:** This phase is primarily content creation, not infrastructure. The only new code is a focused CSV export script. Everything else is markdown content and manual tool usage.

## Common Pitfalls

### Pitfall 1: Address Field Mismatch with Stannp
**What goes wrong:** CSV columns don't match Stannp's expected field names, causing import failure or blank merge fields in the booklet.
**Why it happens:** Stannp uses specific field names (`address1`, `address2`, `city`, `postcode`) that may not match the database column names.
**How to avoid:** Map columns explicitly in the export script. Use `mappings` parameter on the import endpoint if column names differ.
**Warning signs:** Stannp marks recipients as "invalid" after import.

### Pitfall 2: Missing Postcode in Mailing Address
**What goes wrong:** Owner addresses from Companies House or CCOD may be stored as a single string without a separate postcode field.
**Why it happens:** The `owner_address` and `mailing_address` columns store full address strings, not parsed components.
**How to avoid:** Parse the postcode from the address string (UK postcodes have a reliable format: 1-2 letters, 1-2 digits, space, digit, 2 letters). Validate before export.
**Warning signs:** Stannp rejects recipients with missing postcodes.

### Pitfall 3: Name Parsing for Company vs Individual
**What goes wrong:** Company names (e.g., "ACME PROPERTY LTD") get split into firstname/lastname incorrectly.
**Why it happens:** Stannp expects firstname/lastname for individuals but company name for businesses.
**How to avoid:** Check `entity_type`: for `ltd`/`llp`, use `company` field and leave firstname/lastname empty (or use director name from `director_names` column). For individuals, split the name.
**Warning signs:** Letters addressed to "ACME" "PROPERTY LTD" instead of the company name or director.

### Pitfall 4: Forgetting Privacy Notice Link
**What goes wrong:** Direct mail must include a way for recipients to access the privacy notice and opt out.
**Why it happens:** Privacy notice exists at `docs/compliance/privacy-notice.md` but the booklet may not reference the URL.
**How to avoid:** Ensure the booklet design includes sjbpropertygroup.com/landlord-privacy-policy URL and opt-out instructions (already referenced in the privacy notice).
**Warning signs:** No opt-out mechanism on the letter = GDPR non-compliance.

### Pitfall 5: Sending to Suppressed Leads
**What goes wrong:** A lead who previously opted out receives another letter.
**Why it happens:** New export script doesn't use the shared suppression filter.
**How to avoid:** ALWAYS use `suppressionFilter()` from `export-filters.js` in the SQL WHERE clause. The existing pattern makes this easy.
**Warning signs:** Export count includes leads marked as suppressed.

## Code Examples

### Stannp Export Script Structure
```javascript
// scripts/export-stannp.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const { suppressionFilter } = require('./lib/export-filters');
const db = require('./lib/db');
const { EXPORTS_DIR } = require('./lib/config');

const BATCH_SIZE = parseInt(process.argv[2]) || 30;

// Query top-scored BTL leads with address data
const rows = db.prepare(`
  SELECT l.*, 
    GROUP_CONCAT(DISTINCT p.address) as property_addresses,
    MIN(p.current_energy_rating) as worst_epc,
    COUNT(DISTINCT p.id) as property_count,
    MIN(p.address) as first_property_address,
    MIN(p.postcode) as first_postcode
  FROM landlords l
  LEFT JOIN properties p ON p.landlord_id = l.id
  WHERE (l.match_group_id IS NULL OR l.is_primary_record = 1)
    AND ${suppressionFilter()}
    AND l.btl_suitable = 1
    AND (l.owner_address IS NOT NULL OR l.mailing_address IS NOT NULL 
         OR EXISTS (SELECT 1 FROM properties p2 WHERE p2.landlord_id = l.id))
  GROUP BY l.id
  ORDER BY l.tired_score DESC
  LIMIT ?
`).all(BATCH_SIZE);

// ... address parsing + CSV formatting
```

### UK Postcode Extraction
```javascript
// Extract postcode from end of address string
function extractPostcode(address) {
  if (!address) return null;
  const match = address.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/i);
  return match ? match[1].trim().toUpperCase() : null;
}
```

### Address Line Splitting
```javascript
// Split a full address string into Stannp fields
function parseAddress(fullAddress) {
  if (!fullAddress) return { line1: '', line2: '', city: '', postcode: '' };
  const postcode = extractPostcode(fullAddress);
  const withoutPostcode = fullAddress.replace(/,?\s*[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\s*$/i, '').trim();
  const parts = withoutPostcode.split(/,\s*/);
  return {
    line1: parts[0] || '',
    line2: parts.length > 2 ? parts.slice(1, -1).join(', ') : '',
    city: parts[parts.length - 1] || '',
    postcode: postcode || '',
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual letter writing | Stannp API with merge fields | Established | Automated personalisation at scale |
| Generic "Dear Landlord" | Personalised with name, property, EPC | This phase | Higher response rates from personalisation |
| Single channel blast | Primary channel + asset preparation | This phase | Measured rollout, add channels as data allows |

## Open Questions

1. **Stannp Template Upload**
   - What we know: The booklet is an external PDF design. Stannp accepts PDF templates with merge field placeholders in `{field}` syntax.
   - What's unclear: Whether the existing booklet PDF already has merge field placeholders or needs editing. The booklet is outside the repo.
   - Recommendation: Sam uploads the booklet to Stannp dashboard, adds merge field placeholders `{firstname}`, `{epc_rating}`, `{property_count}`, `{property_address}` in the Stannp template editor. The export script just produces the data CSV.

2. **Director Name vs Company Name for Salutation**
   - What we know: `director_names` column exists from Phase 3 enrichment. Companies should be addressed to the director, not the company.
   - What's unclear: How many top-scored leads have director names populated.
   - Recommendation: Use director name for salutation when available; fall back to company name. The export script should include both fields.

3. **Stannp Account Setup**
   - What we know: Stannp is pay-as-you-go with no minimum. UK API base: `https://api-eu1.stannp.com/v1/`.
   - What's unclear: Whether Sam already has a Stannp account and API key.
   - Recommendation: Account creation and API key generation is a manual prerequisite before the export script can be tested against the API.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None -- uses `node --test` CLI |
| Quick run command | `node --test scripts/tests/test-stannp-export.js` |
| Full suite command | `node --test scripts/tests/test-*.js` |

### Phase Requirements -> Test Map
| Req ID | Behaviour | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OUT-BTL-01 | Stannp CSV export with correct columns, suppression filter, address selection | unit | `node --test scripts/tests/test-stannp-export.js` | No -- Wave 0 |
| OUT-BTL-02 | Email sequence content exists as markdown with correct structure | smoke | Manual file check | N/A |
| OUT-BTL-03 | Phone script content exists as markdown | smoke | Manual file check | N/A |
| OUT-BTL-04 | LinkedIn template content exists as markdown | smoke | Manual file check | N/A |

### Sampling Rate
- **Per task commit:** `node --test scripts/tests/test-stannp-export.js`
- **Per wave merge:** `node --test scripts/tests/test-*.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/tests/test-stannp-export.js` -- covers OUT-BTL-01 (Stannp CSV format, suppression, address waterfall, name parsing)
- [ ] Test DB helper pattern already exists in `test-build-lead-list.js` -- reuse `createTestDb()` pattern with Phase 3 + Phase 4 migrations

## Sources

### Primary (HIGH confidence)
- Stannp UK API documentation -- campaigns, recipients, letters endpoints verified
- Existing codebase: `scripts/build-lead-list.js`, `scripts/lib/export-filters.js`, `scripts/migrate-phase3.js`, `scripts/migrate-phase4.js`, `scripts/enrich-proprietor-address.js`
- `docs/compliance/privacy-notice.md` -- opt-out requirements for outreach

### Secondary (MEDIUM confidence)
- [Stannp Letters API](https://www.stannp.com/uk/direct-mail-api/letters) -- endpoint parameters, merge field syntax
- [Stannp Campaigns API](https://www.stannp.com/uk/direct-mail-api/campaigns) -- campaign workflow (create, approve, book)
- [Stannp Recipients API](https://www.stannp.com/uk/direct-mail-api/recipients) -- field mapping, import endpoint
- [Stannp API Guide](https://www.stannp.com/uk/direct-mail-api/guide) -- authentication, UK base URL `api-eu1.stannp.com`

### Tertiary (LOW confidence)
- [Stannp API FAQ](https://go.stannp.com/blogs/stannp-api-faqs) -- general capabilities overview

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all existing patterns reused
- Architecture: HIGH -- follows established export script pattern from build-lead-list.js
- Pitfalls: HIGH -- based on actual codebase analysis (address storage, entity types, suppression)
- Stannp API specifics: MEDIUM -- verified via official docs but some detail on merge field rendering in templates unclear

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, Stannp API unlikely to change)
