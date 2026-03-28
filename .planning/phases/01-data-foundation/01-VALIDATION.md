---
phase: 1
slug: data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node --test` (v24 native) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node --test scripts/tests/` |
| **Full suite command** | `node --test scripts/tests/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test scripts/tests/`
- **After every plan wave:** Run `node --test scripts/tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFRA-01 | unit | `node --test scripts/tests/test-db.js` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | INFRA-02 | smoke/manual | Manual: `claude mcp list` | manual-only | ⬜ pending |
| 01-03-01 | 03 | 2 | INFRA-03 | integration | `node --test scripts/tests/test-epc.js` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | INFRA-04 | integration | `node --test scripts/tests/test-companies-house.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/tests/` directory creation
- [ ] `scripts/tests/test-db.js` — stubs for INFRA-01 (schema creation, insert/query operations)
- [ ] `scripts/tests/test-epc.js` — stubs for INFRA-03 (API call with test postcode, response parsing, filtering)
- [ ] `scripts/tests/test-companies-house.js` — stubs for INFRA-04 (company search, officer lookup, entity classification)

---

## Manual-Only Verifications

| Behaviour | Requirement | Why Manual | Test Instructions |
|-----------|-------------|------------|-------------------|
| MCP servers respond to commands | INFRA-02 | MCP server availability requires Claude Code runtime context | Run `claude mcp list` and verify Apify, Playwright, Companies House servers appear and respond |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
