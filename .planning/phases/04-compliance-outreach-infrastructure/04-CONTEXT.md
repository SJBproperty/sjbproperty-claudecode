# Phase 4: Compliance & Outreach Infrastructure - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

GDPR/PECR compliance documentation, suppression list mechanism, and PECR entity type gate enforced in the export pipeline. Email sending infrastructure (secondary domains, Zoho Mail, Instantly.ai warmup) is **deferred** — only 3 email leads exist from enrichment, making domain warmup premature. ICO registration already current.

This phase produces legal documentation and pipeline safeguards. Outreach content (letters, scripts, templates) belongs in Phases 5 and 6.

</domain>

<decisions>
## Implementation Decisions

### GDPR documentation
- **Legitimate Interest Assessment:** ICO's standard LIA template, filled in with SJB-specific details — data sources (EPC Register, Companies House, HMO registers, Land Registry CCOD, OpenRent), processing purposes (B2B landlord marketing for property management services), balancing test. Template-based, not solicitor-reviewed
- **Privacy notice and data retention policy:** Markdown files in `docs/compliance/` folder in repo, version-controlled. Copy to sjbpropertygroup.com when ready. Published URL linkable in outreach materials
- **Data retention period:** 12 months from collection, then review — delete if no engagement. Standard for B2B prospecting
- **Opt-out mechanism:** "Reply STOP to opt out" for email channel. No unsubscribe link infrastructure needed. Instantly.ai handles reply detection natively. Direct mail includes reply address for opt-out

### Suppression list
- **Storage:** Database columns on landlords table — `suppressed` (boolean), `suppressed_date`, `suppressed_reason`. Consistent with Phase 3's flat-table approach
- **Scope:** Universal suppression — if someone opts out via any channel, suppress across ALL channels (email, mail, phone, LinkedIn). Safest legally, simplest to implement
- **Enforcement:** Pre-export filter — export scripts check `suppressed` flag before including any lead in outreach lists (Stannp CSV, email imports, phone lists). Scripts refuse to export suppressed leads
- **Bulk import:** Not needed yet — start with manual one-by-one suppression. Build bulk import script if/when volume demands it

### PECR entity type gate
- **Enforcement:** Export script hard-filters to `entity_type = 'Ltd'` or `'LLP'` for any email outreach list. Sole traders and individuals only appear in direct mail and phone exports
- **Implementation:** Pre-export checkpoint in the same script pattern as suppression filtering. One gate, two checks (suppressed + entity type for email)

### Email sending infrastructure — DEFERRED
- Secondary domain purchase: deferred (only 3 email leads exist)
- Zoho Mail setup: deferred
- Instantly.ai signup and warmup: deferred
- Revisit when email enrichment produces enough leads to justify setup (50+ email leads minimum)

### ICO registration
- Already current — no action needed this phase

### Claude's Discretion
- LIA template formatting and exact wording (within ICO framework)
- Privacy notice structure and legal phrasing
- Migration script approach for new suppression columns
- Whether to create a shared export utility or add suppression/PECR checks to existing export scripts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Business context, two arms (BTL management 10% fee vs R2R commercial lease), GDPR compliance constraint
- `.planning/REQUIREMENTS.md` — COMP-01 through COMP-04 define this phase's 4 requirements
- `.planning/ROADMAP.md` — Phase 4 success criteria, tool setup pause notes

### Prior phase context
- `.planning/phases/03-lead-scoring-crm/03-CONTEXT.md` — Enrichment schema (columns on landlords table), Notion CRM choice, entity type classification, tiered enrichment waterfall, PECR compliance decisions
- `.planning/phases/01-data-foundation/01-CONTEXT.md` — Database design, entity_type field on landlords table
- `.planning/phases/02-data-sources-deduplication/02-CONTEXT.md` — Source priority, dedup rules

### Existing code (reuse/extend)
- `scripts/lib/db.js` — SQLite connection module (extend for suppression columns migration)
- `scripts/build-lead-list.js` — CSV export pipeline (add suppression + PECR gate filters)
- `scripts/export-notion.js` — Notion CRM export (suppression sync)
- `scripts/enrich-contacts.js` — Contact enrichment (reference for entity_type field usage)

### No external specs
No external API documentation or ADRs exist in the project. ICO LIA template and PECR guidance are publicly available — researcher should fetch current ICO documentation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/lib/db.js` — SQLite connection and helpers. Needs migration for suppression columns
- `scripts/build-lead-list.js` — CSV export pipeline with 5 date-stamped exports. Add suppression + PECR gate as pre-export filters
- `scripts/migrate-phase3.js` — Prior migration pattern to follow for adding suppression columns
- `scripts/export-notion.js` — Notion export script. May need suppressed leads excluded or marked

### Established Patterns
- Plain JavaScript (Node.js), no TypeScript, no build step
- `require('dotenv').config()` for API keys
- Scripts in `scripts/`, data in `data/` (gitignored)
- SQLite at `data/sjb-leads.db` — landlords table (9,545 records)
- Columns added directly to landlords table (no separate tables for enrichment or suppression)
- Idempotent migrations via try/catch on duplicate column name

### Integration Points
- Suppression columns added to landlords table via migration script
- Export scripts (`build-lead-list.js`, future Stannp export) gain suppression + PECR gate filters
- Notion export may need to reflect suppression status
- Compliance docs in `docs/compliance/` — new directory

</code_context>

<specifics>
## Specific Ideas

- Only 3 email leads found during enrichment — email infrastructure is premature. Focus this phase on legal docs and pipeline safeguards
- Property address is the primary contact method (97.5% coverage from Phase 3 enrichment) — direct mail is the dominant channel, making GDPR/PECR docs and suppression list the critical deliverables
- No-contact landlords flagged as PRIME direct mail candidates in Phase 3 — suppression list must handle these correctly (don't suppress just because they lack email)

</specifics>

<deferred>
## Deferred Ideas

- **Email sending infrastructure** — Secondary domains, Zoho Mail, Instantly.ai warmup. Revisit when 50+ email leads available
- **Unsubscribe link on website** — Build a web endpoint for opt-outs if/when email volume justifies it
- **Bulk suppression import** — CSV import script for purchased suppression lists or bulk opt-outs. Build when needed
- **n8n follow-up automation** — Deferred from Phase 3 for automated CRM reminders

</deferred>

---

*Phase: 04-compliance-outreach-infrastructure*
*Context gathered: 2026-03-31*
