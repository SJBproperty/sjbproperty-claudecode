---
phase: 07-digital-presence-polish
verified: 2026-04-04T00:00:00Z
status: human_needed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Open landing-page/index.html in Chrome, check mobile layout and visual brand"
    expected: "Navy (#0F222D) background, gold CTA buttons, steel-blue accents, Montserrat headings, no horizontal scroll on mobile (375px viewport), all sections readable"
    why_human: "Visual rendering cannot be verified programmatically — CSS parses fine but layout, font loading, and colour accuracy require a browser viewport"
  - test: "Click the primary CTA 'Book a Free Consultation' on the landing page"
    expected: "Opens Microsoft Bookings URL (outlook.office365.com/book/SJBPropertyGroup1@sjbproperty.com) and allows external visitors to book a slot"
    why_human: "Whether the Microsoft Bookings link is publicly accessible to non-SJB users requires live testing in an incognito browser session"
  - test: "Click 'Message Us on WhatsApp' on the landing page"
    expected: "Opens WhatsApp with pre-filled message 'Hi Sam, I received your letter about property management. I'd like to find out more.' — correct number (447441395123)"
    why_human: "WhatsApp deep link must be tested on a mobile device to confirm the number and pre-fill text are correct"
  - test: "Verify Instagram bio copy fits within Instagram's 150-character limit"
    expected: "Bio of 4 lines pastes cleanly into Instagram profile editor and is accepted without truncation"
    why_human: "The bio text is 170 characters (the file incorrectly claims 143). Instagram's limit is 150 characters. Sam should paste the bio into Instagram to confirm — it may require trimming one line."
  - test: "Deploy landing-page/ directory to Netlify and confirm the site loads on mobile"
    expected: "Page loads at deployed URL, security headers present (check via securityheaders.com), /privacy redirect works, Google Fonts load"
    why_human: "Deployment outcome and live URL availability cannot be verified from the filesystem — Netlify deployment is a manual step"
---

# Phase 7: Digital Presence Polish — Verification Report

**Phase Goal:** Polish digital presence — landing page for QR code destination and Instagram content to pass credibility check when landlords look up SJB Property after receiving direct mail.
**Verified:** 2026-04-04
**Status:** HUMAN_NEEDED (all automated checks passed — 5 items need human testing)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Landing page loads on mobile with correct brand colours (Navy #0F222D background, white text, Steel Blue #8CA6BB accents) | ? HUMAN | Files exist and CSS variables present; visual rendering needs browser check |
| 2 | Landlord scanning QR code sees a professional page reinforcing the direct mail letter messaging | ✓ VERIFIED | index.html contains hero, pain points (EPC, void periods, Renters' Rights Bill, tenant issues), services, trust signals, and dual CTA — all aligned with direct mail pitch |
| 3 | Primary CTA (Book a Free Consultation) links to a booking tool URL | ✓ VERIFIED | `href="https://outlook.office365.com/book/SJBPropertyGroup1@sjbproperty.com/?ismsaljsauthenabled=true"` present in both hero and cta-bottom sections |
| 4 | Secondary CTA (WhatsApp) opens wa.me deep link with pre-filled message | ✓ VERIFIED | `href="https://wa.me/447441395123?text=Hi%20Sam%2C%20I%20received%20your%20letter...` present in both CTA locations |
| 5 | Trust signals visible: 7 properties, 100% rent collection, compliance credentials | ✓ VERIFIED | Stats grid contains "7", "100%", and 7 compliance badges including NRLA, Property Redress Scheme, ICO |
| 6 | Privacy notice accessible via footer link | ✓ VERIFIED | `privacy.html` linked from footer; privacy.html exists with full content, Data controller section, and back link to index.html |
| 7 | Instagram bio copy is rewritten to target property management landlords in Stockport/Manchester | ✓ VERIFIED | profile-updates.md contains new bio with "Property Management | Stockport & Greater Manchester" and 3 lines of management-focused copy |
| 8 | Display name is set to a discoverable name (not blank) | ✓ VERIFIED | profile-updates.md specifies "SJB Property Group | Manchester" with rationale about Instagram search discoverability |
| 9 | 8 ready-to-post Instagram content pieces exist with full captions and design briefs | ✓ VERIFIED | 8 post-*.md files in docs/instagram/, each with ## Type, ## Caption, ## Design Notes (#0F222D), ## Hashtags |
| 10 | Carousel posts include slide-by-slide text content ready for Canva design | ✓ VERIFIED | All carousel posts (01, 02, 03, 05, 06, 07, 08) contain ### Slide 1 through final slide with headline, subtext, and design specs |
| 11 | Highlight cover brief specifies 3-4 categories with design specifications | ✓ VERIFIED | highlight-covers-brief.md specifies 4 covers (Services, Portfolio, Results, FAQ) with 1080x1920px dimensions, brand colours (#0F222D), and Montserrat font |
| 12 | All content uses British English, real SJB data, and includes a CTA | ✓ VERIFIED | No American spellings detected; Post 02 uses real deal figures (£100k purchase, £20k refurb, £180k GDV); every post ends with CTA; no guarantee/risk-free language |

**Score:** 11/12 truths fully automated-verified (1 requires human — visual rendering)

---

## Required Artifacts

### Plan 07-01: Landing Page

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `landing-page/index.html` | Landing page HTML with all 8 sections | ✓ VERIFIED | hero, pain-points, services, trust, about, cta-bottom, footer all present; lang="en-GB" |
| `landing-page/css/style.css` | Mobile-first responsive stylesheet | ✓ VERIFIED | --navy: #0F222D, --steel-blue: #8CA6BB, @media min-width 768px, .btn-primary, .btn-secondary, .prose all present |
| `landing-page/privacy.html` | Privacy notice as HTML page | ✓ VERIFIED | Full privacy notice with "Data controller", "SJB Property Group Ltd", style.css linked, back link to index.html |
| `landing-page/netlify.toml` | Netlify deployment config with security headers | ✓ VERIFIED | [build], X-Frame-Options, Content-Security-Policy, /privacy redirect all present |
| `landing-page/img/logo-white.png` | White logo image | ✓ VERIFIED | File exists at landing-page/img/logo-white.png |

### Plan 07-02: Instagram Content

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/instagram/profile-updates.md` | Bio copy, display name, pinned posts | ✓ VERIFIED | Display Name, Bio, bio.site link, Pinned Posts sections all present |
| `docs/instagram/post-01-management-services-carousel.md` | 5-slide carousel | ✓ VERIFIED | Slide 1 through 5, Caption, Dimensions 1080x1350, Hashtags, #0F222D |
| `docs/instagram/post-02-deal-breakdown-carousel.md` | Deal breakdown with real numbers | ✓ VERIFIED | £100,000 purchase, £20k refurb, £180k GDV, £135k refinance — real BRRR deal data |
| `docs/instagram/post-03-epc-compliance-carousel.md` | 4-slide EPC carousel | ✓ VERIFIED | Full structure |
| `docs/instagram/post-04-track-record-stats.md` | Single image with stats | ✓ VERIFIED | "7 Properties", "100% Rent Collection" present |
| `docs/instagram/post-05-before-after-refurb.md` | 3-slide before/after | ✓ VERIFIED (partial) | Structure complete; photo placeholders documented with instructions for Sam — this is intentional, not a stub |
| `docs/instagram/post-06-what-we-handle.md` | 5-slide service breakdown | ✓ VERIFIED | Full structure |
| `docs/instagram/post-07-landlord-faq.md` | 4-slide FAQ | ✓ VERIFIED | Full structure |
| `docs/instagram/post-08-stockport-market-insight.md` | 4-slide market insight | ✓ VERIFIED | Full structure |
| `docs/instagram/highlight-covers-brief.md` | 4 highlight cover specs | ✓ VERIFIED | 4 covers, 1080x1920, #0F222D, Montserrat |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `landing-page/index.html` | `landing-page/css/style.css` | `<link rel="stylesheet" href="css/style.css">` | ✓ WIRED | Confirmed in file |
| `landing-page/index.html` | `landing-page/privacy.html` | Footer link | ✓ WIRED | `href="privacy.html"` in footer |
| `landing-page/index.html` | `https://wa.me/447441395123` | WhatsApp CTA button | ✓ WIRED | Live number with pre-filled message in both CTAs |
| `landing-page/index.html` | Microsoft Bookings URL | Primary CTA button | ✓ WIRED | `outlook.office365.com/book/SJBPropertyGroup1@sjbproperty.com` in both CTAs |
| `landing-page/privacy.html` | `landing-page/css/style.css` | `<link rel="stylesheet" href="css/style.css">` | ✓ WIRED | Confirmed in file |
| `landing-page/privacy.html` | `landing-page/index.html` | Back link | ✓ WIRED | `href="index.html"` back navigation present |
| `docs/instagram/profile-updates.md` | Instagram @sjbpropertygroup | Manual update by Sam | ? HUMAN | Content ready; requires Sam to paste into Instagram |
| `docs/instagram/post-*.md` | Canva design workflow | Design briefs | ? HUMAN | Content ready; requires Sam/designer to use Canva |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DIG-01 | 07-01-PLAN.md | Landing page as QR code destination | ✓ SATISFIED | landing-page/index.html with all sections deployed-ready |
| DIG-02 | 07-02-PLAN.md | Instagram profile optimisation | ✓ SATISFIED | profile-updates.md with exact bio copy and display name |
| DIG-03 | 07-02-PLAN.md | Instagram content posts | ✓ SATISFIED | 8 post files with captions, slide content, design briefs |
| DIG-04 | 07-02-PLAN.md | Instagram highlight covers | ✓ SATISFIED | highlight-covers-brief.md with 4 categories and brand specs |

All 4 phase requirements satisfied. No orphaned requirements.

---

## Anti-Patterns Found

| File | Finding | Severity | Impact |
|------|---------|----------|--------|
| `docs/instagram/post-05-before-after-refurb.md` | Photo placeholders `[PLACEHOLDER — Sam to provide before photo...]` | ℹ️ Info | Intentional — post requires real photos before publishing. Clearly documented with project suggestions (Moston/Churchill). Not a code stub. |
| `docs/instagram/profile-updates.md` | Bio claims "143 characters" but actual length is 170 characters | ⚠️ Warning | The bio text is 20 chars over Instagram's 150-char limit. Sam will need to trim when pasting into Instagram. Suggested trim: shorten "7 properties | 100% rent collection | 0 voids" to "7 properties managed | 100% rent collection". |
| `landing-page/css/style.css` | Uses CSS property `background-color`, `color`, `text-align` (standard CSS — not Americanisms) | ℹ️ Info | CSS property names are not British/American choices — these are the correct CSS specifications. Not a real issue. |

---

## Human Verification Required

### 1. Mobile Layout and Brand Visual Check

**Test:** Open `landing-page/index.html` in Chrome. Enable DevTools (F12) > Device Toolbar > iPhone 14 Pro (390px). Scroll through all sections.
**Expected:** Navy background throughout, gold CTA buttons (`#C9A84C`), steel-blue accent text, Montserrat on headings, Open Sans on body. No horizontal scroll. Pain point cards stack vertically (4 cards). Services stack vertically. Stats grid shows 2 columns on mobile, 4 on desktop.
**Why human:** CSS renders correctly on parse but visual layout, font loading from Google Fonts CDN, and colour fidelity require a browser to confirm.

### 2. Microsoft Bookings Link Accessibility

**Test:** Open the consultation booking URL in a private/incognito browser window (not logged into Microsoft 365): `https://outlook.office365.com/book/SJBPropertyGroup1@sjbproperty.com/?ismsaljsauthenabled=true`
**Expected:** A public booking page loads allowing any visitor to book a consultation slot without requiring a Microsoft account.
**Why human:** Microsoft Bookings pages can be set to require authentication. If external visitors (landlords) get a login prompt, the CTA fails. Must be tested unauthenticated.

### 3. WhatsApp Deep Link on Mobile

**Test:** On a mobile device with WhatsApp installed, tap the WhatsApp CTA button on the landing page.
**Expected:** WhatsApp opens with number 447441395123 (Sam's number) and pre-filled text "Hi Sam, I received your letter about property management. I'd like to find out more."
**Why human:** WhatsApp deep links (`wa.me`) must be tested on an actual mobile device — they cannot be verified from a desktop or filesystem.

### 4. Instagram Bio Character Count

**Test:** Copy the bio text from `docs/instagram/profile-updates.md` and paste it into Instagram's bio field (Settings > Edit Profile > Bio).
**Expected:** Instagram accepts the bio without truncation. If it shows an error or truncates, trim the third line to "7 properties | 100% collection | 0 voids" (39 chars, saves 6 chars, total becomes ~164) or similar.
**Why human:** The file notes claim "143 characters" but the actual text is 170 characters (including newlines). Instagram's 150-char limit will likely require one line to be shortened. Sam should test and adjust.

### 5. Netlify Deployment

**Test:** Connect the `landing-page/` directory to Netlify (either drag-and-drop deploy or connect the GitHub repo with publish directory set to `landing-page`). Confirm the deployed URL loads.
**Expected:** Page loads over HTTPS. Check security headers at securityheaders.com — should show A or B rating. Navigate to `/privacy` (not `/privacy.html`) and confirm redirect works.
**Why human:** Deployment is a manual infrastructure step requiring Netlify account access and domain configuration decisions.

---

## Gaps Summary

No blocking gaps found. All 15 artifacts exist, are substantive (not stubs), and key links are wired. The phase goal is achieved at the code level.

The 5 human verification items are operational steps that cannot be completed from the filesystem:
1. Visual browser rendering check (high confidence it will pass given correct CSS)
2. Microsoft Bookings external accessibility check (medium priority — must confirm before mail drops)
3. WhatsApp deep link mobile test (high confidence it will pass)
4. Instagram bio character count adjustment (low effort fix if needed — max 20 chars to trim)
5. Netlify deployment (required before QR code goes live)

**Critical path item:** The Microsoft Bookings check (#2) should be done before the Phase 5 direct mail letters are sent. If the booking page requires authentication, the primary CTA will fail for all landlord visitors.

---

## Commit Verification

All task commits from SUMMARY.md verified in git history:

| Commit | Task | Verified |
|--------|------|---------|
| `d86c242` | Task 1: Create landing page HTML and CSS | ✓ |
| `24408d7` | Task 2: Create privacy notice and Netlify config | ✓ |
| `c56bbab` | Post-review: Gold accent, Renters' Rights Bill, live CTAs | ✓ |
| `bb00574` | Task 1: Instagram profile updates and highlight brief | ✓ |
| `d79d7b2` | Task 2: Generate 8 Instagram posts | ✓ |

---

_Verified: 2026-04-04_
_Verifier: Claude (gsd-verifier)_
