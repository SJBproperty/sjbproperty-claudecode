---
phase: 5
slug: btl-management-campaign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node:test) |
| **Config file** | None — uses `node --test` CLI |
| **Quick run command** | `node --test scripts/tests/test-stannp-export.js` |
| **Full suite command** | `node --test scripts/tests/test-*.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test scripts/tests/test-stannp-export.js`
- **After every plan wave:** Run `node --test scripts/tests/test-*.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | OUT-BTL-01 | unit | `node --test scripts/tests/test-stannp-export.js` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | OUT-BTL-01 | unit | `node --test scripts/tests/test-stannp-export.js` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | OUT-BTL-02 | smoke | Manual file check | N/A | ⬜ pending |
| 05-02-02 | 02 | 1 | OUT-BTL-03 | smoke | Manual file check | N/A | ⬜ pending |
| 05-02-03 | 02 | 1 | OUT-BTL-04 | smoke | Manual file check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/tests/test-stannp-export.js` — stubs for OUT-BTL-01 (Stannp CSV format, suppression, address waterfall, name parsing)
- [ ] Reuse `createTestDb()` pattern from existing `test-build-lead-list.js` with Phase 3 + Phase 4 migrations

*Existing infrastructure (node:test runner, better-sqlite3, csv-stringify) covers all phase requirements.*

---

## Manual-Only Verifications

| Behaviour | Requirement | Why Manual | Test Instructions |
|-----------|-------------|------------|-------------------|
| Email sequence markdown content | OUT-BTL-02 | Content quality, not code logic | Review `docs/outreach/btl-email-sequences.md` has 3 emails with EPC hook opener |
| Phone script markdown content | OUT-BTL-03 | Content quality, not code logic | Review `docs/outreach/btl-phone-script.md` has pain points, service overview, booking flow |
| LinkedIn template markdown content | OUT-BTL-04 | Content quality, not code logic | Review `docs/outreach/btl-linkedin-templates.md` has connection request + DM sequence |
| Stannp booklet merge fields match CSV columns | OUT-BTL-01 | External PDF outside repo | Verify Stannp template placeholders match CSV header columns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
