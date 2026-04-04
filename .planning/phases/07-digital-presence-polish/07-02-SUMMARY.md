---
phase: 07-digital-presence-polish
plan: 02
subsystem: content
tags: [instagram, social-media, content-marketing, carousel, brand]

# Dependency graph
requires:
  - phase: 07-01
    provides: "Landing page and brand colour system for consistent digital presence"
  - phase: 05
    provides: "BTL management messaging and outreach strategy"
provides:
  - "Instagram profile optimisation guide (bio, display name, pinned posts)"
  - "8 ready-to-post Instagram content pieces with captions and carousel design briefs"
  - "Highlight cover design brief for 4 categories"
affects: [content-calendar, social-media-scheduling, canva-design]

# Tech tracking
tech-stack:
  added: []
  patterns: [instagram-post-template, carousel-design-brief-format]

key-files:
  created:
    - docs/instagram/profile-updates.md
    - docs/instagram/highlight-covers-brief.md
    - docs/instagram/post-01-management-services-carousel.md
    - docs/instagram/post-02-deal-breakdown-carousel.md
    - docs/instagram/post-03-epc-compliance-carousel.md
    - docs/instagram/post-04-track-record-stats.md
    - docs/instagram/post-05-before-after-refurb.md
    - docs/instagram/post-06-what-we-handle.md
    - docs/instagram/post-07-landlord-faq.md
    - docs/instagram/post-08-stockport-market-insight.md
  modified: []

key-decisions:
  - "8 posts chosen to cover all content pillars: services, social proof, education, deal breakdowns, market insights, FAQ"
  - "Carousel format used for 7 of 8 posts to maximise engagement and swipe-through"
  - "Real SJB deal data used in Post 02 (deal breakdown) for authenticity"

patterns-established:
  - "Instagram post template: Type, Dimensions, Slide Content, Caption, Design Notes, Hashtags"
  - "Carousel design brief format with slide-by-slide text ready for Canva"

requirements-completed: [DIG-02, DIG-03, DIG-04]

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 7 Plan 02: Instagram Content Summary

**Instagram profile optimisation and 8 management-focused posts with carousel design briefs, targeting landlords checking SJB after direct mail outreach**

## Performance

- **Duration:** 5 min (continuation from checkpoint approval)
- **Started:** 2026-04-03T09:19:00Z
- **Completed:** 2026-04-03T09:30:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files created:** 10

## Accomplishments
- Instagram profile guide with exact bio copy (under 150 chars), display name for discoverability, and pinned post strategy
- 8 ready-to-post Instagram content pieces covering management services, deal breakdowns, EPC compliance, track record, before/after refurbs, service details, landlord FAQ, and Stockport market insight
- Highlight cover design brief for 4 categories (Services, Portfolio, Results, FAQ) using SJB brand colours
- All content uses real SJB data, British English, and includes CTAs

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Instagram profile updates and highlight cover brief** - `bb00574` (feat)
2. **Task 2: Generate 8 Instagram posts with captions and carousel design briefs** - `d79d7b2` (feat)
3. **Task 3: Review Instagram content for brand voice and accuracy** - checkpoint:human-verify (approved by Sam)

## Files Created/Modified
- `docs/instagram/profile-updates.md` - Bio copy, display name, pinned post strategy
- `docs/instagram/highlight-covers-brief.md` - Design specs for 4 highlight cover categories
- `docs/instagram/post-01-management-services-carousel.md` - 5-slide carousel: self-managing costs vs SJB management
- `docs/instagram/post-02-deal-breakdown-carousel.md` - 6-slide carousel: real deal breakdown with actual numbers
- `docs/instagram/post-03-epc-compliance-carousel.md` - 4-slide carousel: EPC regulation changes
- `docs/instagram/post-04-track-record-stats.md` - Single image: 7 properties, 100% collection, 0 voids
- `docs/instagram/post-05-before-after-refurb.md` - 3-slide carousel: before/after with stats (needs photos from Sam)
- `docs/instagram/post-06-what-we-handle.md` - 5-slide carousel: full service breakdown
- `docs/instagram/post-07-landlord-faq.md` - 4-slide carousel: top landlord questions
- `docs/instagram/post-08-stockport-market-insight.md` - 4-slide carousel: Stockport BTL market data

## Decisions Made
- 8 posts chosen to cover all content pillars: services, social proof, education, deal breakdowns, market insights, FAQ
- Carousel format used for 7 of 8 posts to maximise engagement and swipe-through
- Real SJB deal data used in Post 02 (deal breakdown) for authenticity
- Post 05 (before/after) requires actual photos from Sam -- placeholder boxes included

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Sam needs to:
1. Update Instagram bio by copying text from `docs/instagram/profile-updates.md`
2. Set display name to "SJB Property Group | Manchester"
3. Create carousel graphics in Canva using the slide text and design briefs from each post file
4. Post all 8 pieces and pin recommended posts (01, 04, 06) to top of grid
5. Create 4 highlight covers using specs in `docs/instagram/highlight-covers-brief.md`
6. Source before/after photos for Post 05

## Next Phase Readiness
- Phase 7 complete -- all digital presence assets built (landing page + Instagram content)
- Instagram grid will look active and management-focused when landlords check after receiving direct mail
- Content ready for Canva design and posting

## Self-Check: PASSED

- All 10 content files exist in docs/instagram/
- Commit bb00574 (Task 1) verified
- Commit d79d7b2 (Task 2) verified

---
*Phase: 07-digital-presence-polish*
*Completed: 2026-04-03*
