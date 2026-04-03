---
phase: 7
slug: digital-presence-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser testing + Lighthouse |
| **Config file** | None — no automated test framework for static HTML |
| **Quick run command** | Open `index.html` in browser, Chrome DevTools responsive mode |
| **Full suite command** | `npx lighthouse https://[deployed-url] --output html` |
| **Estimated runtime** | ~30 seconds (manual), ~15 seconds (Lighthouse) |

---

## Sampling Rate

- **After every task commit:** Visual review of HTML changes in browser
- **After every plan wave:** Full page test on mobile device + Lighthouse score
- **Before `/gsd:verify-work`:** Deployed landing page live and functional, Instagram content files complete
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | N/A-LP-01 | manual | Chrome DevTools device emulator | N/A | ⬜ pending |
| 07-01-02 | 01 | 1 | N/A-LP-02 | manual | Click Cal.com button, verify booking flow | N/A | ⬜ pending |
| 07-01-03 | 01 | 1 | N/A-LP-03 | manual | Click wa.me link on mobile device | N/A | ⬜ pending |
| 07-01-04 | 01 | 1 | N/A-LP-04 | manual | Visual check on mobile viewport | N/A | ⬜ pending |
| 07-01-05 | 01 | 1 | N/A-LP-05 | manual | Click footer link, verify page loads | N/A | ⬜ pending |
| 07-02-01 | 02 | 2 | N/A-IG-01 | manual | View @sjbpropertygroup profile | N/A | ⬜ pending |
| 07-02-02 | 02 | 2 | N/A-IG-02 | manual | Review content markdown files | N/A | ⬜ pending |
| 07-02-03 | 02 | 2 | N/A-IG-03 | manual | Visual review of Canva outputs | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `landing-page/` directory — new project structure
- [ ] `landing-page/index.html` — main landing page
- [ ] `landing-page/css/style.css` — responsive stylesheet
- [ ] `docs/instagram/` directory — for generated content files
- [ ] Photo assets collected and compressed

*Wave 0 creates project structure; no automated test framework needed for static HTML/CSS.*

---

## Manual-Only Verifications

| Behaviour | Requirement | Why Manual | Test Instructions |
|-----------|-------------|------------|-------------------|
| Landing page loads on mobile | N/A-LP-01 | Visual/responsive check | Open in Chrome DevTools, test iPhone SE + iPhone 14 Pro + iPad viewports |
| Booking CTA opens Cal.com | N/A-LP-02 | External service integration | Click CTA button, verify Cal.com booking widget loads |
| WhatsApp CTA opens chat | N/A-LP-03 | Mobile-only deep link | Click wa.me link on physical mobile device |
| Trust signals visible above fold | N/A-LP-04 | Visual layout check | Verify stats/credentials visible without scrolling on mobile |
| Privacy notice linked in footer | N/A-LP-05 | Link check | Click footer privacy link, verify page loads |
| Instagram bio updated | N/A-IG-01 | Platform-specific check | View live @sjbpropertygroup profile |
| Content files complete | N/A-IG-02 | Content review | Count markdown files in docs/instagram/, verify 5-10 posts |
| Carousel graphics match brand | N/A-IG-03 | Visual brand check | Compare colours, fonts against brand guidelines |

---

## Validation Sign-Off

- [ ] All tasks have manual verify or Wave 0 dependencies
- [ ] Sampling continuity: visual review after every task commit
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
