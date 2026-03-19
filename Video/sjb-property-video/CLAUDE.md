# SJB Property Group — Video Project Context

## READ THIS FIRST
You are working inside the SJB Property Group Remotion video project. Your job is to build, edit, and generate video content that builds authority, attracts investors and JV partners, and grows the SJB brand. Always use the WaveSpeed API for AI generation — it is the single hub for all image, video, voiceover, voice clone, and avatar capabilities.

---

## The Business (Summary)
- **Company:** SJB Property Group Ltd | UK residential property investment | Founded 2019
- **Founder:** Sam Bradbury — based in Abu Dhabi, managing a UK portfolio remotely
- **Focus:** Buy-to-let (BTL) and House in Multiple Occupation (HMO) value-add in Greater Manchester (Stockport preference)
- **Portfolio:** 7 properties | ~£1,735,000 value | ~£100,800 gross rent/yr | ~£3,500/month net cashflow
- **Website:** https://www.sjbpropertygroup.com
- **Social:** @sjbpropertygroup (Instagram) | @SJBPropertygroup (YouTube) | @sjbproperty (TikTok)

## Target Audience
- Professionals 25–65 with £30k–£100k to invest — time-poor (doctors, lawyers, business owners)
- Expats seeking hands-off UK property exposure
- Goal: passive income, portfolio growth, financial freedom
- Trust triggers: real numbers, transparency, skin in the game

---

## Project Structure
```
sjb-property-video/
├── .env                          ← API keys (never commit)
├── public/
│   └── logo.png                  ← SJB logo — ALWAYS include in videos
├── src/
│   ├── config.ts                 ← loads .env centrally
│   ├── data.ts                   ← all property data, stats, services
│   ├── gemini.ts                 ← Gemini content generation (legacy)
│   ├── generate-content.ts       ← pre-render content script
│   ├── generated-content.json    ← AI-generated copy used by video
│   ├── index.ts                  ← Remotion root entry
│   ├── Root.tsx                  ← composition definitions
│   ├── PropertyShowcase.tsx      ← main video component
│   ├── apis/
│   │   └── wavespeed.ts          ← WaveSpeed hub (all AI generation)
│   └── scenes/
│       ├── IntroScene.tsx
│       ├── PropertyScene.tsx
│       ├── ManagementScene.tsx
│       ├── StatsScene.tsx
│       └── OutroScene.tsx
```

---

## WaveSpeed API — Central AI Hub
**All AI generation goes through WaveSpeed. One key. Full capability.**

| Capability | Function | Model (env var) |
|---|---|---|
| Image generation (quality) | `generateImage()` | `google/nano-banana-pro/text-to-image` (`WAVESPEED_IMAGE_MODEL`) |
| Image generation (fast) | `generateImage({ fast: true })` | `google/nano-banana-2/text-to-image-fast` (`WAVESPEED_IMAGE_MODEL_FAST`) |
| Property backgrounds | `generatePropertyBackground()` | uses `WAVESPEED_IMAGE_MODEL` |
| Video clips | `generateVideo()` | `wavespeed-ai/kling-2-0` (`WAVESPEED_VIDEO_MODEL`) |
| Voiceover (quality) | `generateVoiceover()` | `elevenlabs/eleven-v3` (`WAVESPEED_TTS_MODEL`) |
| Voiceover (fast) | `generateVoiceover({ fast: true })` | `elevenlabs/flash-v2.5` (`WAVESPEED_TTS_MODEL_FAST`) |
| AI voice clone of Sam | `generateWithClonedVoice()` | `minimax/voice-clone` (`WAVESPEED_VOICE_CLONE_MODEL`) |
| AI avatar video of Sam | `generateAvatarVideo()` | `wavespeed-ai/skyreels-v3-talking-avatar` (`WAVESPEED_AVATAR_MODEL`) |

**Import from:** `import { generateImage, generateVoiceover, ... } from "./apis/wavespeed"`

### Voice clone setup
To use Sam's cloned voice, provide a reference audio URL (10–30s clear MP3/WAV of Sam speaking):
```ts
const audio = await generateWithClonedVoice({
  text: "Welcome to SJB Property Group...",
  referenceAudioUrl: "https://your-audio-sample.mp3",
});
```

### Avatar video setup
Combine a photo of Sam + generated audio:
```ts
const video = await generateAvatarVideo({
  imageUrl: "https://your-photo.jpg",
  audioUrl: audioUrl, // from generateVoiceover or generateWithClonedVoice
});
```

---

## Key Commands
```bash
# Start Remotion Studio (live preview at localhost:3000)
npm run dev

# Pre-generate AI marketing copy (reads WAVESPEED/Gemini key from .env)
npm run generate

# Render final video to out/sjb-property-showcase.mp4
npm run build
```

---

## Brand Rules (apply to every video)
- **Primary colour:** Navy `#1a2634` / `#0F222D`
- **Accent:** Steel Blue `#8CA6BB`
- **Highlight/Gold:** `#c9a84c`
- **Text:** Cream `#f0ead6` or White `#ffffff` on dark backgrounds
- **Fonts:** Montserrat (headings), Open Sans (body) — load via `@remotion/google-fonts`
- **Logo:** ALWAYS include `public/logo.png` — bottom or top of frame, never obscured
- **Style:** Dark backgrounds, clean and modern, real numbers visible, no stock photo fakery
- **Format:** 1080×1920 portrait (Reels/TikTok/Shorts) — can add 1920×1080 landscape for YouTube

## Tone of Voice (on-screen text)
- Straight-talking, confident, data-driven
- "Let's break this down" / "Here's the reality" / "The numbers speak for themselves"
- British English — no Americanisms
- Never guarantee returns or imply risk-free
- Short punchy overlays: max 10–15 words per slide

## Content Pillars (video themes)
1. **Deal Breakdowns** — real purchase price, refurb cost, rent, ROI
2. **Property Management** — services, peace of mind, hands-off
3. **Portfolio Showcases** — 7 properties, stats, track record
4. **Personal Brand** — Sam's story, Abu Dhabi → Manchester
5. **Education** — BRRR strategy, HMO vs BTL, how to invest
6. **Social Proof** — investor returns (8–12.5%), testimonials, milestones
7. **Property Sourcing** — deal spotlights, ROI breakdowns

---

## Video Types to Build
| Type | Duration | Format | Platform |
|---|---|---|---|
| Property showcase | 30–60s | 1080×1920 | Instagram Reels, TikTok |
| Deal breakdown | 60–90s | 1080×1920 | Reels, YouTube Shorts |
| Portfolio overview | 45–60s | 1080×1920 | Reels, TikTok |
| Educational explainer | 8–12min | 1920×1080 | YouTube |
| Investor pitch | 60–90s | 1080×1920 | Reels, DM follow-up |
| Property sourcing spotlight | 30–60s | 1080×1920 | Reels, TikTok |

---

## Rules for Claude Code (video project)
1. Always use British English
2. All figures in GBP (£)
3. Never guarantee returns or imply risk-free investing
4. Use real data from `src/data.ts` — never invent deal numbers
5. Always include `public/logo.png` in every composition
6. Use WaveSpeed for all AI generation — never hardcode other API keys
7. Keep `.env` clean — one key (`WAVESPEED_API_KEY`) only
8. Follow Remotion best practices from `.agents/skills/remotion-best-practices/`
9. Portrait format (1080×1920) is the default — add landscape only when explicitly asked
10. Every video should end with a call to action: "DM INVEST" / "DM SOURCE" / "sjbpropertygroup.com"
