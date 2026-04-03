# Phase 7: Digital Presence Polish - Research

**Researched:** 2026-04-03
**Domain:** Static landing page (HTML/CSS), Instagram content strategy, brand collateral
**Confidence:** HIGH

## Summary

Phase 7 is a content and frontend deliverable phase -- not a backend/scripting phase like previous ones. The core deliverables are: (1) a standalone HTML/CSS landing page hosted on a free static platform, designed as the QR code destination from the Phase 5 direct mail booklet; (2) Instagram profile optimisation (bio rewrite, display name, pinned posts); and (3) Instagram content generation (5-10 ready-to-post items including carousel designs via Canva MCP).

The landing page is a single-page, mobile-first responsive site using the SJB brand palette (Navy #0F222D, Steel Blue #8CA6BB, White #FFFFFF) with Montserrat/Open Sans fonts. It must convert landlords who scan the QR code into consultation bookings or WhatsApp conversations. The Instagram work bulks up a nearly-dormant profile (5 posts, last active October 2024) so it passes the "credibility check" when landlords look up SJB Property after receiving a letter.

**Primary recommendation:** Use Netlify for hosting (best free tier for static sites with form handling), Cal.com free tier for booking embed, and wa.me deep links for WhatsApp CTA. Build the landing page as vanilla HTML/CSS (no framework needed for a single page). Generate Instagram content as markdown files with Canva MCP for carousel graphics.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Standalone coded page (HTML/CSS) hosted on Netlify, Vercel, or GitHub Pages -- not Squarespace/Wix
- Squarespace is fallback only if standalone approach fails
- This is the QR code landing page from direct mail letters
- Dual CTA: "Book a free consultation call" (primary, Calendly or similar) + WhatsApp direct message (secondary)
- Trust signals: track record stats, compliance credentials, before/after photos
- No investor testimonials on this page
- Brand colours: Navy #0F222D, Steel Blue #8CA6BB, White #FFFFFF
- Fonts: Montserrat headings, Open Sans body
- Must be mobile-optimised
- Instagram bio rewrite targeted to management services
- Set Instagram display name (currently blank)
- Link stays as bio.site/SJBpropertygroup
- Pin 2-3 management-focused posts to top of grid
- Full content generation: 5-10 posts, captions, carousel text, reel scripts
- Carousel graphics via Canva MCP
- Content types: before/after refurb photos, finished property photos (no selfies/headshots/video)
- Content pillars: deal breakdowns, social proof/track record, property management services, education
- Highlight covers via Canva for 3-4 categories
- Biosite: no changes
- LinkedIn: skipped this phase

### Claude's Discretion
- Landing page exact layout, sections, and copy structure
- Instagram bio exact wording (within brand voice guidelines)
- Which specific post topics to generate from content pillars
- Highlight category names and cover design specifics
- Carousel design layout within Canva
- Whether to use Calendly, Cal.com, or similar for consultation CTA
- Hosting platform choice (Netlify vs Vercel vs GitHub Pages)

### Deferred Ideas (OUT OF SCOPE)
- LinkedIn profile optimisation
- LinkedIn company page
- Biosite updates
- Video content creation
- Instagram Reels strategy
- Website full redesign (sjbpropertygroup.com main site)
</user_constraints>

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| HTML5 + CSS3 | Current | Landing page markup and styling | No framework needed for single-page static site |
| Netlify | Free tier | Static site hosting with HTTPS, CDN | Best free static host for landing pages -- custom domains, auto-SSL, form handling, deploy previews |
| Cal.com | Free tier | Booking widget embed | Open-source, free embed on any plan, no redirect needed, inline/popup options |
| Google Fonts CDN | Current | Montserrat + Open Sans | Simpler than self-hosting for a single landing page; both fonts are top-20 most used |
| Canva MCP | Current | Instagram carousel and highlight cover generation | Available in project tooling, generates brand-consistent graphics |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| wa.me deep links | WhatsApp click-to-chat | Secondary CTA on landing page -- format: `https://wa.me/44XXXXXXXXXX?text=URL-encoded-message` |
| Font Awesome or similar | Icons for trust badges and CTAs | Only if needed for visual polish; inline SVGs preferred for performance |
| CSS custom properties | Brand colour/font management | Define once, use everywhere -- makes brand consistency trivial |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Netlify | GitHub Pages | GitHub Pages lacks form handling and deploy previews; fine if forms not needed |
| Netlify | Vercel | Vercel overkill for plain HTML; optimised for React/Next.js apps |
| Cal.com | Calendly | Calendly free tier limited to one event type; Cal.com free is more generous and open-source |
| Google Fonts CDN | Self-hosted fonts | Self-hosting is ~50-100ms faster but adds build complexity; not worth it for a single landing page |

### Hosting Recommendation: Netlify

**Why Netlify over alternatives:**
- Free tier includes: custom domain, auto-SSL, CDN, 100GB bandwidth/month, form submissions (100/month)
- Built-in form handling means the contact form works without any backend
- Deploy from GitHub repo with automatic builds on push
- Deploy previews for testing before going live
- Simplest setup for plain HTML/CSS (drag-and-drop or git deploy)

**Setup:** Create a GitHub repo for the landing page, connect to Netlify, set custom domain (e.g. manage.sjbpropertygroup.com or sjbpropertygroup.com/manage).

## Architecture Patterns

### Recommended Project Structure
```
landing-page/
├── index.html           # Single landing page
├── privacy.html         # Privacy notice page (or link to existing)
├── css/
│   └── style.css        # All styles (mobile-first)
├── img/
│   ├── logo-white.png   # White on transparent logo
│   ├── hero.jpg          # Hero background or property photo
│   └── projects/        # Before/after property photos
├── fonts/               # Only if self-hosting (not recommended)
└── netlify.toml         # Netlify config (redirects, headers)
```

### Pattern 1: Mobile-First Responsive Landing Page
**What:** Build CSS mobile-first, then add `@media (min-width: 768px)` breakpoints for tablet/desktop
**When to use:** Always -- QR codes from letters are scanned on phones
**Example:**
```css
/* Mobile-first base styles */
:root {
  --navy: #0F222D;
  --steel-blue: #8CA6BB;
  --white: #FFFFFF;
  --slate: #46465F;
}

body {
  font-family: 'Open Sans', sans-serif;
  background-color: var(--navy);
  color: var(--white);
  margin: 0;
  padding: 0;
  line-height: 1.6;
}

h1, h2, h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
}

.container {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Tablet+ */
@media (min-width: 768px) {
  .container { padding: 3rem 2rem; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
}
```

### Pattern 2: Dual CTA Section
**What:** Primary booking CTA + secondary WhatsApp CTA side-by-side (stacked on mobile)
**When to use:** Main conversion section of landing page
**Example:**
```html
<section class="cta-section">
  <a href="https://cal.com/sjbproperty/consultation" class="btn btn-primary">
    Book a Free Consultation
  </a>
  <a href="https://wa.me/44XXXXXXXXXX?text=Hi%20Sam%2C%20I%20received%20your%20letter%20about%20property%20management"
     class="btn btn-secondary">
    Message on WhatsApp
  </a>
</section>
```

### Pattern 3: Cal.com Embed (Inline or Popup)
**What:** Embed booking widget directly in the page
**When to use:** If we want booking without leaving the page (higher conversion)
**Example:**
```html
<!-- Cal.com inline embed -->
<div id="cal-inline" style="width:100%;height:100%;overflow:scroll"></div>
<script type="text/javascript">
  (function (C, A, L) { /* Cal.com embed snippet */ })
  (window, "https://cal.com", "init");
  Cal("init", {origin:"https://cal.com"});
  Cal("inline", {
    elementOrSelector:"#cal-inline",
    calLink: "sjbproperty/consultation",
    layout: "month_view"
  });
</script>

<!-- OR Cal.com popup button (simpler) -->
<button data-cal-link="sjbproperty/consultation"
        data-cal-config='{"layout":"month_view"}'>
  Book a Free Consultation
</button>
<script>
  (function (C, A, L) { /* Cal.com embed snippet */ })
  (window, "https://cal.com", "init");
  Cal("init", {origin:"https://cal.com"});
</script>
```

### Pattern 4: Instagram Content as Markdown Files
**What:** Generate post content as structured markdown, one file per post
**When to use:** All Instagram content generation
**Example:**
```markdown
# Post 01: Property Management Services Overview

## Type: Carousel (5 slides)

### Slide 1 (Hook)
**Text:** Tired of chasing tenants and dealing with maintenance calls?

### Slide 2
**Text:** SJB Property Management handles everything...

### Caption
[Full caption text with hashtags and CTA]

### Design Notes
- Brand colours: Navy background, white text, steel blue accents
- Font: Montserrat Bold for headlines, Open Sans for body
- Dimensions: 1080 x 1350 px (4:5 portrait)
```

### Anti-Patterns to Avoid
- **Using a JS framework (React, Vue) for a single landing page:** Adds build complexity, bundle size, and load time for zero benefit. Vanilla HTML/CSS is faster, simpler, and easier to deploy.
- **Inline styles throughout:** Use CSS custom properties and a single stylesheet for maintainability.
- **Desktop-first responsive design:** QR code scans are mobile. Build mobile-first or the page will be broken for the primary audience.
- **Stock photography:** Brand guidelines explicitly prohibit generic stock images. Use real project photos only.
- **Over-engineered hosting:** No need for serverless functions, databases, or build pipelines. Plain static files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Booking/scheduling | Custom form + email notification | Cal.com free embed | Handles timezones, availability, confirmations, reminders |
| WhatsApp chat link | Custom chat widget | wa.me deep link with pre-filled text | Universal, works on all devices, no API needed |
| Contact form submission | Custom backend/API | Netlify Forms (HTML attribute) | Zero-config, free 100 submissions/month, spam filter |
| CSS reset/normalise | Custom reset stylesheet | Modern CSS reset (Josh Comeau or similar) | Handles cross-browser quirks, well-tested |
| Icon library | Custom SVG sprites | Inline SVGs for the 5-6 icons needed | Fewer dependencies, no external requests |

**Key insight:** This is a single landing page. Every external dependency adds load time and complexity. Keep it minimal -- the page should load in under 2 seconds on mobile.

## Common Pitfalls

### Pitfall 1: QR Code Goes to Wrong URL
**What goes wrong:** QR code in the direct mail booklet points to sjbpropertygroup.com (main site) instead of the new landing page
**Why it happens:** Landing page URL not finalised before booklet printed, or URL changed after printing
**How to avoid:** Decide the final URL (e.g. manage.sjbpropertygroup.com) BEFORE any letters are sent. Use a redirect-capable URL so destination can be changed later.
**Warning signs:** QR code destination not documented in the plan

### Pitfall 2: Landing Page Not Mobile-Optimised
**What goes wrong:** Page looks great on desktop but breaks on mobile -- text too small, buttons too close together, horizontal scrolling
**Why it happens:** Developing on desktop and not testing mobile
**How to avoid:** Build mobile-first CSS. Test with Chrome DevTools device emulator. Use rem/em units, not px for text.
**Warning signs:** Fixed-width containers, pixel-based font sizes, no media queries

### Pitfall 3: Slow Loading from Unoptimised Images
**What goes wrong:** Before/after property photos are 3-5MB each, page takes 10+ seconds on mobile
**Why it happens:** Photos straight from camera without compression
**How to avoid:** Compress all images (WebP format, max 200KB each). Use `loading="lazy"` for below-fold images. Serve responsive sizes with `srcset`.
**Warning signs:** Image files larger than 500KB

### Pitfall 4: Instagram Content Doesn't Match Brand Voice
**What goes wrong:** Generated captions sound generic, use Americanisms, or make prohibited claims
**Why it happens:** Not referencing tone-of-voice guidelines and content rules
**How to avoid:** Every piece of content must be checked against: British English, no guaranteed returns, no "get rich quick" language, real data only, CTA on every post
**Warning signs:** Words like "crushing it", "passive income guru", dollar signs, American spellings

### Pitfall 5: Cal.com/Calendly Not Set Up Before Page Goes Live
**What goes wrong:** Booking button leads to a dead link or unconfigured calendar
**Why it happens:** Landing page built before booking tool account is created
**How to avoid:** Create the Cal.com account and event type first, then embed. Test the full booking flow before deploying.
**Warning signs:** Placeholder URLs in the HTML

### Pitfall 6: Privacy Notice Not Linked
**What goes wrong:** Landing page collects data (form submissions, booking info) without linking to privacy notice
**Why it happens:** Compliance step forgotten during build
**How to avoid:** Footer MUST include link to privacy notice. The notice already exists at `docs/compliance/privacy-notice.md` -- convert to HTML or host as a page.
**Warning signs:** No footer links, no privacy/cookie mention

## Code Examples

### Landing Page Section Structure (Recommended)
```html
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Management Services | SJB Property Group</title>
  <meta name="description" content="Professional property management in Stockport and Greater Manchester. 10% fully managed service. Book a free consultation.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Hero: Logo + headline + sub-headline -->
  <header class="hero">...</header>

  <!-- Pain Points: What landlords struggle with -->
  <section class="pain-points">...</section>

  <!-- Services: What SJB offers (mirrors booklet) -->
  <section class="services">...</section>

  <!-- Trust Signals: Stats + credentials -->
  <section class="trust">...</section>

  <!-- Before/After: Project photos -->
  <section class="portfolio">...</section>

  <!-- CTA: Book consultation + WhatsApp -->
  <section class="cta">...</section>

  <!-- Footer: Contact, privacy notice link, credentials -->
  <footer>...</footer>
</body>
</html>
```

### Netlify Forms (Zero-Config Contact Form)
```html
<!-- Netlify detects this automatically -- no backend needed -->
<form name="consultation" method="POST" data-netlify="true" netlify-honeypot="bot-field">
  <p class="hidden">
    <label>Don't fill this out: <input name="bot-field" /></label>
  </p>
  <input type="text" name="name" placeholder="Your name" required>
  <input type="tel" name="phone" placeholder="Phone number" required>
  <input type="email" name="email" placeholder="Email address">
  <textarea name="message" placeholder="Tell us about your property"></textarea>
  <button type="submit">Request a Callback</button>
</form>
```

### WhatsApp Deep Link with Pre-filled Message
```html
<!-- International format, no + or leading 0 -->
<a href="https://wa.me/44XXXXXXXXXX?text=Hi%20Sam%2C%20I%20received%20your%20letter%20about%20property%20management.%20I%27d%20like%20to%20find%20out%20more."
   class="btn btn-whatsapp">
  Message Us on WhatsApp
</a>
```

### Instagram Carousel Dimensions
```
Optimal: 1080 x 1350 px (4:5 portrait ratio)
All slides: Same aspect ratio (Instagram crops mismatched slides)
Safe zone: Keep text 50px from all edges
Grid preview: Centre 1012 x 1350 px visible on profile grid
Max slides: 20 per carousel (increased from 10 in 2024)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Fonts CDN only | Self-hosting growing (30%+ of sites) | 2022+ | CDN still fine for simple sites; self-host for performance-critical |
| 10-slide Instagram carousel max | 20-slide carousel max | 2024 | More room for educational content |
| Square Instagram posts (1:1) | Portrait (4:5) preferred | 2023+ | Takes up more feed space, better engagement |
| Desktop-first responsive | Mobile-first responsive | Standard practice | Essential when primary traffic source is QR code mobile scan |

## Open Questions

1. **Sam's WhatsApp number for wa.me link**
   - What we know: The CTA requires a WhatsApp business number
   - What's unclear: Whether Sam uses a UK number or UAE number for WhatsApp Business
   - Recommendation: Planner should flag this as input needed from Sam before deployment

2. **Cal.com account setup**
   - What we know: Cal.com free tier supports embed and is the recommended booking tool
   - What's unclear: Whether Sam already has a Cal.com or Calendly account
   - Recommendation: Account creation and event configuration should be an explicit task (or flag as manual step)

3. **Custom domain for landing page**
   - What we know: Page needs a URL for the QR code
   - What's unclear: Whether to use a subdomain (manage.sjbpropertygroup.com) or path on existing site
   - Recommendation: Subdomain is cleanest -- separate from Squarespace main site, easy to point via DNS

4. **Before/after property photos**
   - What we know: Photos are available as content assets
   - What's unclear: Where they are stored, what format/resolution, how many
   - Recommendation: Planner should include a task to collect, compress, and organise photo assets

5. **Canva MCP capabilities**
   - What we know: Canva MCP is listed as available in CONTEXT.md
   - What's unclear: Exact API surface -- can it create designs from scratch, or only modify templates?
   - Recommendation: First task in Instagram content plan should probe Canva MCP capabilities

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual browser testing + Lighthouse |
| Config file | None -- no automated test framework for static HTML |
| Quick run command | Open `index.html` in browser, Chrome DevTools responsive mode |
| Full suite command | `npx lighthouse https://[deployed-url] --output html` |

### Phase Requirements -> Test Map
| Req ID | Behaviour | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| N/A-LP-01 | Landing page loads on mobile | manual | Chrome DevTools device emulator | N/A |
| N/A-LP-02 | Booking CTA works | manual | Click Cal.com button, verify booking flow | N/A |
| N/A-LP-03 | WhatsApp CTA opens chat | manual | Click wa.me link on mobile device | N/A |
| N/A-LP-04 | Trust signals visible above fold | manual | Visual check on mobile viewport | N/A |
| N/A-LP-05 | Privacy notice linked | manual | Click footer link, verify page loads | N/A |
| N/A-IG-01 | Instagram bio updated | manual | View @sjbpropertygroup profile | N/A |
| N/A-IG-02 | 5-10 posts ready to publish | manual | Review content markdown files | N/A |
| N/A-IG-03 | Carousel graphics match brand | manual | Visual review of Canva outputs | N/A |

### Sampling Rate
- **Per task commit:** Visual review of HTML changes in browser
- **Per wave merge:** Full page test on mobile device + Lighthouse score
- **Phase gate:** Deployed landing page live and functional, Instagram content files complete

### Wave 0 Gaps
- [ ] `landing-page/` directory -- new project structure
- [ ] `landing-page/index.html` -- main landing page
- [ ] `landing-page/css/style.css` -- responsive stylesheet
- [ ] `docs/instagram/` directory -- for generated content files
- [ ] Photo assets collected and compressed

## Sources

### Primary (HIGH confidence)
- SJB Brand Guidelines (`1.SJB Property/Brand Info/SJB_BRAND_GUIDELINES_FILLED.txt`) -- colours, fonts, visual rules
- SJB Social Media Context (`1.SJB Property/Social Media/CLAUDE.md`) -- content pillars, tone, platform details
- Phase 5 Context (`.planning/phases/05-btl-management-campaign/05-CONTEXT.md`) -- booklet design, QR code, messaging
- Phase 7 Context (`.planning/phases/07-digital-presence-polish/07-CONTEXT.md`) -- all locked decisions
- Cal.com embed documentation (https://cal.com/embed)
- WhatsApp click-to-chat documentation (https://faq.whatsapp.com/5913398998672934)

### Secondary (MEDIUM confidence)
- Netlify vs GitHub Pages vs Vercel comparison -- multiple sources agree Netlify best for static landing pages
- Instagram carousel dimensions 1080x1350 -- confirmed by Buffer, Hootsuite, and multiple 2026 guides
- Mobile-first CSS best practices -- MDN Web Docs and multiple authoritative sources

### Tertiary (LOW confidence)
- Canva MCP exact capabilities -- listed as available but API surface not verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- vanilla HTML/CSS + Netlify is well-established, no ambiguity
- Architecture: HIGH -- single-page landing page is a solved problem
- Pitfalls: HIGH -- based on real project constraints (QR code, mobile, brand guidelines)
- Instagram content: MEDIUM -- content generation is straightforward but Canva MCP capabilities unverified

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain -- HTML/CSS, static hosting, Instagram specs change slowly)
