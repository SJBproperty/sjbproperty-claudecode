---
phase: 05-btl-management-campaign
plan: 02
subsystem: outreach
tags: [phone-script, linkedin, email-sequences, pecr, btl-management, cold-outreach]

# Dependency graph
requires:
  - phase: 04-compliance-outreach-infrastructure
    provides: PECR gate, suppression filters, privacy notice, LIA
provides:
  - BTL management phone conversation script
  - LinkedIn connection request and DM sequence templates
  - 3-email cold outreach sequence for Ltd/LLP landlords
affects: [05-btl-management-campaign, 06-r2r-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [markdown outreach assets in docs/outreach/]

key-files:
  created:
    - docs/outreach/btl-phone-script.md
    - docs/outreach/btl-linkedin-templates.md
    - docs/outreach/btl-email-sequences.md
  modified: []

key-decisions:
  - "All outreach assets stored as markdown in docs/outreach/ for version control and easy editing"
  - "Email sequences reference pecrEmailGate() enforcement -- Ltd/LLP only"
  - "Phone and LinkedIn are asset-only -- no contact data available this phase"

patterns-established:
  - "Outreach content as version-controlled markdown in docs/outreach/"
  - "Consistent messaging across channels: 10% fee, 7 properties, 100% rent collection, zero voids"
  - "Privacy notice URL and unsubscribe mechanism in every email footer"

requirements-completed: [OUT-BTL-02, OUT-BTL-03, OUT-BTL-04]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 5 Plan 2: Outreach Content Assets Summary

**Phone script, LinkedIn templates, and 3-email PECR-compliant sequence for BTL management landlord outreach across all channels**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T16:39:02Z
- **Completed:** 2026-04-01T16:41:20Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Phone script with warm follow-up approach referencing letter, discovery questions, pain point responses, objection handling, and consultation CTA
- LinkedIn templates with 2 connection request variants (company reference, EPC reference) and 3-message DM follow-up sequence
- 3-email cold outreach sequence (Day 0 EPC hook, Day 3 social proof, Day 8 direct CTA) with PECR compliance gate enforcing Ltd/LLP only
- All content uses consistent messaging: 10% fee, 7 properties, 100% rent collection, zero voids
- Privacy notice and unsubscribe mechanism in every email footer

## Task Commits

Each task was committed atomically:

1. **Task 1: Create phone script and LinkedIn templates** - `8dfd68b` (feat)
2. **Task 2: Create email sequences** - `457f05c` (feat)

## Files Created/Modified
- `docs/outreach/btl-phone-script.md` - Warm follow-up phone conversation guide with opening, discovery, pain points, service overview, objections, and CTA
- `docs/outreach/btl-linkedin-templates.md` - 2 connection request templates and 3 follow-up DM sequence with merge fields
- `docs/outreach/btl-email-sequences.md` - 3-email sequence (Day 0/3/8) with PECR compliance note, merge fields, and sending notes

## Decisions Made
- All outreach assets stored as markdown in docs/outreach/ for version control and easy editing
- Email sequences explicitly reference pecrEmailGate() from export-filters.js for PECR enforcement
- Phone and LinkedIn created as ready-to-use assets despite no contact data available this phase
- Email privacy footer uses sjbpropertygroup.com/landlord-privacy-policy URL from privacy notice

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- All 3 outreach content assets ready for use
- Phone script ready for when phone numbers become available via enrichment
- LinkedIn templates ready for when LinkedIn profiles are identified
- Email sequences ready to send manually to 3 Ltd/LLP leads or load into Instantly.ai when configured
- Combined with Plan 01 (Stannp CSV export), all Phase 5 outreach deliverables are complete

---
*Phase: 05-btl-management-campaign*
*Completed: 2026-04-01*
