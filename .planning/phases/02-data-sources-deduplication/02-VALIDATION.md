---
phase: 2
slug: data-sources-deduplication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node:test) |
| **Config file** | None — uses `node --test` |
| **Quick run command** | `node --test scripts/tests/test-*.js` |
| **Full suite command** | `node --test scripts/tests/test-*.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test scripts/tests/test-*.js`
- **After every plan wave:** Run `node --test scripts/tests/test-*.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DATA-01 | unit | `node --test scripts/tests/test-ccod.js` | No — Wave 0 | pending |
| 02-02-01 | 02 | 1 | DATA-02 | unit | `node --test scripts/tests/test-openrent.js` | No — Wave 0 | pending |
| 02-03-01 | 03 | 1 | DATA-03 | unit | `node --test scripts/tests/test-hmo.js` | No — Wave 0 | pending |
| 02-04-01 | 04 | 1 | DATA-04 | unit | `node --test scripts/tests/test-rightmove.js` | No — Wave 0 | pending |
| 02-05-01 | 05 | 2 | INTEL-01 | unit | `node --test scripts/tests/test-dedup.js` | No — Wave 0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `scripts/tests/test-ccod.js` — stubs for DATA-01 (CCOD parsing + postcode filtering)
- [ ] `scripts/tests/test-hmo.js` — stubs for DATA-03 (HMO register CSV/XLSX parsing)
- [ ] `scripts/tests/test-dedup.js` — stubs for INTEL-01 (deduplication logic)
- [ ] `scripts/tests/test-openrent.js` — stubs for DATA-02 (OpenRent result processing)
- [ ] `scripts/tests/test-rightmove.js` — stubs for DATA-04 (Rightmove result processing)

---

## Manual-Only Verifications

| Behaviour | Requirement | Why Manual | Test Instructions |
|-----------|-------------|------------|-------------------|
| Apify Actor runs return expected data | DATA-02, DATA-04 | Requires live Apify MCP connection | Run Actor via MCP, verify output schema matches expected fields |
| CCOD download from Land Registry | DATA-01 | Manual download required (login) | Download CCOD CSV, verify file size > 100MB |
| FOI response file import | DATA-03 | Files arrive externally | When FOI XLSX arrives, run parse-hmo.js and verify DB rows |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
