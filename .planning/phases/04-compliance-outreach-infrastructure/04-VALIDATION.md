---
phase: 4
slug: compliance-outreach-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` + `node:assert/strict` |
| **Config file** | None -- tests run directly via `node scripts/tests/test-*.js` |
| **Quick run command** | `node scripts/tests/test-suppression.js` |
| **Full suite command** | `for f in scripts/tests/test-*.js; do node "$f"; done` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/tests/test-suppression.js`
- **After every plan wave:** Run `for f in scripts/tests/test-*.js; do node "$f"; done`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | COMP-01 | manual | N/A -- document review | N/A | ⬜ pending |
| 04-01-02 | 01 | 1 | COMP-03 | manual | N/A -- document review | N/A | ⬜ pending |
| 04-02-01 | 02 | 1 | COMP-04 | unit | `node scripts/tests/test-suppression.js` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | COMP-04 | unit | `node scripts/tests/test-suppression.js` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 1 | COMP-04 | unit | `node scripts/tests/test-suppression.js` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | COMP-02 | unit | `node scripts/tests/test-suppression.js` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 1 | COMP-02 | unit | `node scripts/tests/test-suppression.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/tests/test-suppression.js` -- covers COMP-02, COMP-04 (migration, filtering, suppress CLI)
- [ ] Test DB helper needs suppression columns in createTestDb() for future tests

*Existing infrastructure covers COMP-01 and COMP-03 (manual document review).*

---

## Manual-Only Verifications

| Behaviour | Requirement | Why Manual | Test Instructions |
|-----------|-------------|------------|-------------------|
| LIA document contains required three-part test sections | COMP-01 | Document content review | Verify `docs/compliance/legitimate-interest-assessment.md` has Purpose, Necessity, Balancing sections with SJB-specific details |
| Privacy notice lists all Article 14 required fields | COMP-03 | Document content review | Verify `docs/compliance/privacy-notice.md` lists data sources, retention period, opt-out mechanism, controller identity |
| Data retention policy states 12-month review period | COMP-03 | Document content review | Verify `docs/compliance/data-retention-policy.md` specifies 12-month retention with review |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
