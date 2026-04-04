---
phase: 07-digital-presence-polish
plan: 01
subsystem: ui
tags: [html, css, landing-page, netlify, mobile-first, responsive]

# Dependency graph
requires:
  - phase: 05-btl-management-campaign
    provides: "Direct mail campaign with QR code needing a landing page destination"
  - phase: 04-compliance-outreach-infrastructure
    provides: "Privacy notice markdown for HTML conversion"
provides:
  - "Standalone HTML/CSS landing page at landing-page/index.html"
  - "Privacy notice HTML page at landing-page/privacy.html"
  - "Netlify deployment config with security headers"
  - "Dual CTA: Microsoft Bookings consultation + WhatsApp deep link"
affects: [07-02-instagram-content, deployment, direct-mail-qr-code]

# Tech tracking
tech-stack:
  added: [google-fonts-montserrat, google-fonts-open-sans, netlify]
  patterns: [mobile-first-css, css-custom-properties, static-html-landing-page]

key-files:
  created:
    - landing-page/index.html
    - landing-page/css/style.css
    - landing-page/privacy.html
    - landing-page/netlify.toml
    - landing-page/img/logo-white.png
  modified:
    - .gitignore

key-decisions:
  - "Gold accent colour (#C9A84C) added for CTA buttons and key stats to improve visual hierarchy"
  - "Renters' Rights Bill card added as fourth pain point to strengthen compliance urgency hook"
  - "Microsoft Bookings used for consultation CTA instead of Cal.com placeholder"
  - "WhatsApp CTA uses live number with pre-filled message"
  - "Mobile-first responsive design with 768px desktop breakpoint"

patterns-established:
  - "SJB brand CSS custom properties: --navy #0F222D, --steel-blue #8CA6BB, --gold #C9A84C"
  - "Landing page structure: hero > pain points > services > trust > about > CTA > footer"

requirements-completed: [DIG-01]

# Metrics
duration: 15min
completed: 2026-04-03
---

# Phase 7 Plan 1: Landing Page Summary

**Mobile-first HTML/CSS landing page with dual CTA (Microsoft Bookings + WhatsApp), trust signals, compliance pain points including Renters' Rights Bill, privacy notice page, and Netlify deployment config**

## Performance

- **Duration:** 15 min (across sessions, including user review)
- **Started:** 2026-04-03
- **Completed:** 2026-04-03
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files created:** 5 (index.html, style.css, privacy.html, netlify.toml, logo-white.png)
- **Files modified:** 1 (.gitignore)

## Accomplishments
- Complete landing page with 8 sections: hero, pain points (4 cards including Renters' Rights Bill), services (Guaranteed Rent + Fully Managed), trust signals (stats + 7 compliance credentials), about, CTA, and footer
- Privacy notice converted from markdown to styled HTML page matching landing page design
- Netlify deployment config with security headers (CSP, X-Frame-Options, X-Content-Type-Options) and /privacy redirect
- Live CTAs: Microsoft Bookings consultation link and WhatsApp deep link with pre-filled message
- Gold accent colour added for CTA buttons and key statistics to improve visual hierarchy and conversion

## Task Commits

Each task was committed atomically:

1. **Task 1: Create landing page HTML structure and CSS** - `d86c242` (feat)
2. **Task 2: Create privacy notice HTML page and Netlify deployment config** - `24408d7` (feat)
3. **Task 3: Verify landing page on mobile and desktop** - checkpoint (human-verify, approved with modifications)
   - Post-review modifications: `c56bbab` (feat) - gold accent, Renters' Rights Bill card, live CTAs

## Files Created/Modified
- `landing-page/index.html` - Main landing page with hero, pain points, services, trust signals, about, CTA, footer
- `landing-page/css/style.css` - Mobile-first responsive CSS with SJB brand colours and gold accent
- `landing-page/privacy.html` - Full privacy notice as styled HTML page
- `landing-page/netlify.toml` - Netlify deployment config with security headers and redirects
- `landing-page/img/logo-white.png` - SJB logo (white on transparent) for landing page header
- `.gitignore` - Updated for landing page project

## Decisions Made
- Gold accent colour (#C9A84C) added during user review to improve CTA visibility and visual hierarchy beyond the original navy/steel-blue/white palette
- Renters' Rights Bill added as fourth pain point card (not in original plan's 3 cards) to strengthen the compliance urgency hook for landlords
- Microsoft Bookings chosen as live consultation booking tool (replacing Cal.com placeholder from plan)
- WhatsApp number set to live number with pre-filled message referencing the direct mail letter

## Deviations from Plan

### Post-checkpoint Modifications (User-directed)

**1. Gold accent colour added**
- **Found during:** Task 3 (user review)
- **Issue:** Original navy/steel-blue/white palette lacked visual punch on CTA buttons
- **Fix:** Added --gold: #C9A84C CSS variable, applied to buttons and stat numbers
- **Committed in:** c56bbab

**2. Fourth pain point card (Renters' Rights Bill)**
- **Found during:** Task 3 (user review)
- **Issue:** Plan specified 3 pain point cards; user wanted compliance urgency strengthened
- **Fix:** Added "Renters' Rights Bill" card with upcoming regulation messaging
- **Committed in:** c56bbab

**3. Live CTAs replacing placeholders**
- **Found during:** Task 3 (user review)
- **Issue:** Plan used Cal.com and placeholder WhatsApp number
- **Fix:** Replaced with Microsoft Bookings URL and live WhatsApp number
- **Committed in:** c56bbab

---

**Total deviations:** 3 user-directed modifications during review checkpoint
**Impact on plan:** All changes improved the landing page quality and made it deployment-ready. No scope creep.

## Issues Encountered
None - plan executed smoothly across all tasks.

## User Setup Required
- Deploy landing-page/ directory to Netlify (connect repo or drag-and-drop)
- Point custom domain or subdomain to Netlify deployment
- Verify Microsoft Bookings link works for external visitors

## Next Phase Readiness
- Landing page ready for Netlify deployment
- QR code in direct mail letters can point to deployed URL
- Phase 7 Plan 2 (Instagram content) can proceed independently

---
*Phase: 07-digital-presence-polish*
*Completed: 2026-04-03*

## Self-Check: PASSED
All 6 files verified present. All 3 task commits verified in git history.
