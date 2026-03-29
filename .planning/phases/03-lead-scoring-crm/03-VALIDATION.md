---
phase: 3
slug: lead-scoring-crm
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in assert + better-sqlite3 temp DB |
| **Config file** | None — follows existing test pattern (temp DB in os.tmpdir()) |
| **Quick run command** | `node scripts/test-scoring.js` |
| **Full suite command** | `node scripts/test-scoring.js && node scripts/test-enrichment.js && node scripts/test-hubspot-export.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/test-scoring.js`
- **After every plan wave:** Run `node scripts/test-scoring.js && node scripts/test-enrichment.js && node scripts/test-hubspot-export.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | INTEL-02 | unit | `node scripts/test-scoring.js` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | INTEL-03 | unit | `node scripts/test-scoring.js` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | INTEL-04 | unit | `node scripts/test-scoring.js` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | INTEL-05 | integration | `node scripts/test-enrichment.js` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | CRM-01 | manual-only | Manual — verify in HubSpot UI | n/a | ⬜ pending |
| 03-03-02 | 03 | 3 | CRM-02 | unit | `node scripts/test-hubspot-export.js` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 3 | CRM-03 | unit | `node scripts/test-hubspot-export.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-scoring.js` — stubs for INTEL-02, INTEL-03, INTEL-04 (scoring, BTL classification, R2R classification)
- [ ] `scripts/test-enrichment.js` — stubs for INTEL-05 (mock API calls for Snov.io/CH enrichment)
- [ ] `scripts/test-hubspot-export.js` — stubs for CRM-02, CRM-03 (CSV format, follow-up date calculation)
- [ ] `scripts/lib/scoring.js` — pure scoring functions extracted for testability

*Existing test infrastructure (scripts/tests/) available — extend with new test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HubSpot pipeline setup | CRM-01 | Requires HubSpot UI interaction | 1. Log into HubSpot 2. Verify pipeline stages: New Lead → Contacted → Follow Up → Consultation Booked → Proposal Sent → Signed → Onboarding 3. Verify custom properties exist: tired_landlord_score, btl_suitable, r2r_suitable, entity_type, property_count, data_sources, epc_rating, void_days |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
