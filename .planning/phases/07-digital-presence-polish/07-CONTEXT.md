# Phase 7: Digital Presence Polish - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Sharpen all public-facing digital touchpoints — website landing page, Instagram profile and content — so inbound leads from the BTL outreach campaign see a credible, professional, conversion-ready brand. This is the "shop front" preparation before direct mail drives traffic to these touchpoints.

Scope: standalone landing page (for QR code from letters), Instagram bio rewrite + content generation + highlight covers + Canva carousel designs. Biosite stays as-is. LinkedIn deferred to a future phase.

</domain>

<decisions>
## Implementation Decisions

### Landing page (primary conversion page)
- Standalone coded page (HTML/CSS) hosted on Netlify, Vercel, or GitHub Pages — not built inside Squarespace/Wix
- Squarespace is the fallback if standalone approach doesn't work out
- This is the page landlords land on when scanning the QR code from the direct mail letter
- Dual CTA: "Book a free consultation call" (primary, Calendly or similar) + WhatsApp direct message (secondary, low barrier)
- Trust signals to include: track record stats (7 properties, 100% rent collection, 0 voids), compliance credentials (NRLA, Property Redress Scheme, ICO registered, Client Money Protection), before/after project photos
- No investor testimonials on this page (not requested)
- Brand colours: Navy #0F222D background, Steel Blue #8CA6BB accents, White #FFFFFF text
- Fonts: Montserrat headings, Open Sans body
- Must be mobile-optimised (most QR scans come from mobile)

### Instagram profile polish
- Rewrite bio to be more targeted — should connect to the management pitch from the letter
- Set display name (currently blank — hurts discoverability in search)
- Link stays as bio.site/SJBpropertygroup
- Pin 2-3 management-focused posts to the top of the grid

### Instagram content generation
- Full content generation — Claude writes ready-to-post captions, carousel slide text, and reel scripts
- Target: 5-10 posts to bulk up the grid before outreach goes live
- Carousel graphics generated via Canva MCP using SJB brand colours and fonts
- Content types available: before/after refurb photos, finished property photos (no selfies/headshots or video footage available)
- Content pillars to draw from: deal breakdowns, social proof/track record, property management services, education
- Highlight covers created via Canva for 3-4 categories (e.g. Services, Portfolio, Track Record, Reviews)

### Biosite
- No changes — keep as-is

### LinkedIn
- Skipped for this phase — not relevant to direct mail outreach campaign
- Deferred to a future phase when LinkedIn outreach becomes active

### Claude's Discretion
- Landing page exact layout, sections, and copy structure
- Instagram bio exact wording (within brand voice guidelines)
- Which specific post topics to generate from the content pillars
- Highlight category names and cover design specifics
- Carousel design layout within Canva
- Whether to use a booking tool (Calendly, Cal.com, etc.) or a simple contact form for the consultation CTA
- Hosting platform choice (Netlify vs Vercel vs GitHub Pages)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Brand identity
- `1.SJB Property/Brand Info/SJB_BRAND_GUIDELINES_FILLED.txt` — Brand colours (#0F222D, #8CA6BB, #FFFFFF), fonts (Montserrat, Open Sans), visual style rules, do's and don'ts
- `1.SJB Property/Brand Info/SJB_COMPANY_BIO_FILLED.txt` — Company bio for about sections and landing page copy
- `1.SJB Property/Brand Info/SJB_LOGOPACK/` — Logo files (Original.png, White on Transparent.png)

### Social media strategy
- `1.SJB Property/Social Media/CLAUDE.md` — Full social media context: platform details, content pillars, tone of voice, content calendar, hashtags, CTAs
- `1.SJB Property/Social Media/content-strategy filled.txt` — Content pillars, calendar approach, series ideas
- `1.SJB Property/Social Media/platforms FILLED.txt` — Platform details (Instagram @sjbpropertygroup 67 followers, priority #1)
- `1.SJB Property/Social Media/tone-of-voice FILLED.txt` — Tone guidelines, phrases to use/avoid

### Business context
- `1.SJB Property/CLAUDE.md` — Full business overview, portfolio snapshot, compliance credentials, brand voice rules
- `1.SJB Property/Track Record/` — Deals log, investor ROI, success stories — source for track record stats on landing page

### Outreach context (what the landing page must reinforce)
- `.planning/phases/05-btl-management-campaign/05-CONTEXT.md` — Direct mail letter details, combined pitch (Guaranteed Rent + 10% Management), EPC compliance hook, QR code links to website
- `docs/outreach/` — Email sequences, phone script, LinkedIn templates created in Phase 5

### Compliance (landing page must reference)
- `docs/compliance/privacy-notice.md` — Privacy notice, must be linkable from landing page
- `docs/compliance/legitimate-interest-assessment.md` — LIA documentation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing frontend code in the project — this will be the first HTML/CSS deliverable
- Canva MCP available for generating carousel graphics and highlight covers
- Apify MCP available for Instagram profile data (used during discuss-phase to audit current state)

### Established Patterns
- Project is Node.js scripts — no frontend framework exists
- Landing page will be standalone (not part of the scripts project)
- Brand assets in `1.SJB Property/Brand Info/SJB_LOGOPACK/` — logo files for embedding

### Integration Points
- Landing page URL will be used as QR code destination in direct mail letters (Phase 5 booklet)
- Instagram bio links to bio.site/SJBpropertygroup which should link to the landing page
- Consultation booking CTA needs a booking tool (Calendly, Cal.com, or similar)
- WhatsApp CTA needs Sam's business WhatsApp number

</code_context>

<specifics>
## Specific Ideas

- The direct mail booklet already exists as a professionally designed 3-page PDF with QR code — the landing page must match that quality and reinforce the same messaging
- Instagram currently has only 5 posts (last posted Oct 2024, 6 months ago) — need to bulk up the grid so the profile looks active and credible when landlords check it
- Before/after refurb photos and finished property photos are available as content assets — no selfies or video footage
- Current Instagram bio uses emoji-heavy format that's generic — needs to be more specific to management services and Stockport/Manchester area
- Display name is blank on Instagram — must be set for search discoverability
- Track record stats for landing page: 7 properties under management, ~£1.7m portfolio value, 100% rent collection record, 0 void months
- Compliance credentials for landing page: NRLA member, Property Redress Scheme #PRS036923, ICO registered, DPS compliant, Client Money Protection, Professional Indemnity, Public Liability

</specifics>

<deferred>
## Deferred Ideas

- **LinkedIn profile optimisation** — Skipped for this phase. Revisit when LinkedIn outreach becomes an active channel
- **LinkedIn company page** — Not needed for personal outreach approach
- **Biosite updates** — Keep as-is for now, revisit if conversion path changes
- **Video content creation** — No video assets available currently. Create when Sam has footage
- **Instagram Reels strategy** — Need video footage first. Content brief focuses on carousels and static posts
- **Website full redesign** — Landing page is standalone; sjbpropertygroup.com main site improvements deferred

</deferred>

---

*Phase: 07-digital-presence-polish*
*Context gathered: 2026-04-03*
