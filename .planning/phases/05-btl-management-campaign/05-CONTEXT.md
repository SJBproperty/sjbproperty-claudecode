# Phase 5: BTL Management Campaign - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

All four outreach channels ready with BTL management messaging. First batch of 20-30 high-scored BTL leads contacted through direct mail (primary channel). Phone script, LinkedIn templates, and email sequences created as ready-to-use assets. Outreach content is the deliverable — not tool setup (Stannp API, Instantly.ai are tool configuration tasks within execution).

</domain>

<decisions>
## Implementation Decisions

### Direct mail letter (primary channel)
- Existing 3-page professionally designed booklet used as the template — design quality is a USP, stands out from generic letters
- Combined pitch: Option A (Guaranteed Rent) + Option B (Fully Managed 10% fee) presented together. Landlord self-selects
- **Guaranteed rent qualifier:** Add small print under Option A: "Guaranteed rent available for qualifying multi-occupancy properties" — R2R doesn't work commercially on standard BTL (no margin on single-let)
- Full personalisation via Stannp merge fields: landlord name, property address, EPC rating, portfolio size (number of properties owned)
- Opening personalised: "Dear [Name]" not "Dear Landlord". Reference their specific property and EPC rating in the opening
- Sent via Stannp API with merge data populated from lead database export

### First batch selection
- Prioritise leads with **owner address** (registered office or residential address from Companies House / enrichment)
- Fallback: property address for leads without owner address (tenant may forward, or landlord may visit)
- No specific geography filter — top scored leads across all target postcodes
- Target: 20-30 leads for first batch

### Channel priority
- Direct mail first and only active channel for initial batch
- No follow-up channel initially — let the letter generate inbound responses (phone calls, QR code scans, emails)
- Email as secondary channel for the 3 leads with email addresses (Ltd/LLP only per PECR gate)
- Phone and LinkedIn are asset-only this phase — no contact data available to use them

### Phone script (asset only — no phone data available)
- Warm follow-up approach referencing the letter: "Hi, I sent you a letter last week about your property at [address]. I'm Sam from SJB Property..."
- Pain points: compliance burden (EPC deadlines), void costs, tenant hassle, time drain
- Service overview: 10% management fee, what's included, hands-off experience
- CTA: book a no-obligation consultation call
- Not actively used this phase — created as ready-to-use asset for when phone numbers become available

### LinkedIn templates (asset only — no LinkedIn data available)
- Connection request references their company/property: "Hi [Name], I noticed [Company] owns rental properties in Stockport. I help landlords like you..."
- Follow-up DM sequence after connection accepted
- Not actively used this phase — created as ready-to-use asset for when LinkedIn profiles become available

### Email sequences (3 leads only, Ltd/LLP entities)
- 3 emails over 2 weeks:
  - Email 1: EPC compliance hook + intro to SJB Property services
  - Email 2: Social proof / case study (3 days after Email 1) — 7 properties managed, 100% rent collection, 0 voids
  - Email 3: Direct CTA to book consultation call (5 days after Email 2)
- Ltd/LLP entities only (PECR gate enforced by export-filters.js)
- Loaded into Instantly.ai when email infrastructure is set up (currently deferred — only 3 email leads)

### Stannp API integration
- Export script produces Stannp-compatible CSV with merge fields: name, address_line_1, address_line_2, city, postcode, epc_rating, property_count, property_address
- Stannp template references these merge fields in the booklet design
- Suppression list checked before export (existing export-filters.js pattern)

### Claude's Discretion
- Exact phone script structure and flow
- LinkedIn DM sequence length and content
- Email subject lines and exact copy
- Stannp CSV column mapping specifics
- Whether to create a dedicated Stannp export script or extend build-lead-list.js

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Compliance (MUST enforce)
- `docs/compliance/legitimate-interest-assessment.md` — LIA for B2B landlord marketing, data sources listed
- `docs/compliance/privacy-notice.md` — Article 14 privacy notice, must be linkable in outreach materials
- `docs/compliance/data-retention-policy.md` — 12-month retention, review cycle
- `scripts/lib/export-filters.js` — Suppression filter + PECR entity type gate. ALL export scripts MUST use these

### Prior phase context
- `.planning/phases/04-compliance-outreach-infrastructure/04-CONTEXT.md` — Suppression list, PECR gate, email infrastructure deferred
- `.planning/phases/03-lead-scoring-crm/03-CONTEXT.md` — Scoring weights, enrichment schema, Notion CRM, contact enrichment tiers
- `.planning/phases/01-data-foundation/01-CONTEXT.md` — Database design, entity_type field

### Existing code (reuse/extend)
- `scripts/build-lead-list.js` — CSV export pipeline with suppression + PECR filters. Extend or create sibling for Stannp export
- `scripts/lib/export-filters.js` — Shared suppression and PECR gate functions
- `scripts/lib/db.js` — SQLite connection module
- `scripts/suppress-lead.js` — Suppression management script

### Existing letter design
- User has a professionally designed 3-page PDF booklet (outside repo). Covers: personalised intro, pain points vs solutions (Option A: Guaranteed Rent, Option B: 10% Management), 4-step process, contact details with QR code
- Booklet needs: guaranteed rent small print qualifier added, merge field placeholders for personalisation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/lib/export-filters.js` — `suppressionFilter()` and `pecrEmailGate()` functions. Must be used in any new export script
- `scripts/build-lead-list.js` — CSV export pattern with date-stamped output. Pattern to follow for Stannp export
- `scripts/lib/db.js` — SQLite connection. Landlords table has: name, entity_type, mailing_address, enrichment fields, suppressed flag, tired_landlord_score, btl_suitable
- `scripts/lib/scoring.js` — Scoring module. Leads already scored and classified

### Established Patterns
- Plain JavaScript (Node.js), no TypeScript, no build step
- `require('dotenv').config()` for API keys (add Stannp API key to .env)
- Scripts in `scripts/`, data in `data/` (gitignored), exports in `data/exports/`
- Idempotent migrations via try/catch
- CSV export with csv-stringify/sync

### Integration Points
- New Stannp export script reads scored+enriched landlords, produces Stannp-format CSV with merge fields
- Email template files stored as markdown in `templates/` or `docs/outreach/`
- Phone script and LinkedIn templates stored as markdown assets
- Suppression + PECR gate enforced at export time via shared library

</code_context>

<specifics>
## Specific Ideas

- The professionally designed booklet IS the letter — not a separate plain text letter. Design quality differentiates from generic letting agent mail
- Booklet includes QR code linking to sjbpropertygroup.com — track scans as a response metric
- Track record stats in booklet: "7 properties under management | 100% rent collection record | 0 void months in 2025"
- Sam's signature is handwritten-style in the booklet — personal touch
- Property address fallback means letters may reach tenants, not landlords — acceptable trade-off for coverage
- Only 3 email leads exist — email sequences are created as assets but Instantly.ai setup may be deferred until more emails are available

</specifics>

<deferred>
## Deferred Ideas

- **Instantly.ai setup and domain warmup** — Deferred from Phase 4. Only 3 email leads. Revisit when 50+ email leads available
- **Phone/LinkedIn contact enrichment** — Manual lookup for top leads (192.com, LinkedIn search). Deferred to future enrichment pass
- **A/B testing different letter versions** — Test EPC-focused vs management-fee-focused opening. Defer until first batch response data is in
- **Response tracking dashboard** — Track QR scans, inbound calls, email replies. Build after first batch to measure campaign effectiveness
- **n8n follow-up automation** — Automated reminders in Notion CRM. Deferred from Phase 3

</deferred>

---

*Phase: 05-btl-management-campaign*
*Context gathered: 2026-04-01*
