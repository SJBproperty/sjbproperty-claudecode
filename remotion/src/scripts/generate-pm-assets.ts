/**
 * Pre-render: generates WaveSpeed assets for the Property Management video.
 *
 * Generates:
 *   public/audio/pm-voiceover.mp3     — ElevenLabs v3 voiceover
 *   public/pm-solution-bg.jpg         — AI property management background image
 *
 * Usage:
 *   npx tsx src/scripts/generate-pm-assets.ts
 */
import * as fs from "fs";
import * as path from "path";
import { generateVoiceover, generateImage } from "../apis/wavespeed";

// 30-second script — ~75 words at natural professional pace
const VOICEOVER_SCRIPT = `Is your property actually working for you?

Void periods draining your returns. Problem tenants you can't shift. Maintenance calls at 3am. Compliance risks you didn't sign up for.

Sound familiar?

SJB Property Group takes all of it off your hands. Tenant find and vetting. Full hands-off management. Guaranteed rent schemes. Regulatory compliance. All handled.

Seven properties managed across Greater Manchester. A track record landlords trust.

DM us the word MANAGE today.`;

async function main() {
  console.log("Generating Property Management video assets via WaveSpeed...\n");

  // ── Voiceover ──────────────────────────────────────────────────────────────
  console.log("1/2 Generating voiceover (ElevenLabs eleven-v3)...");
  const audioPath = path.resolve(__dirname, "../../public/audio/pm-voiceover.mp3");
  try {
    await generateVoiceover({
      text: VOICEOVER_SCRIPT,
      voice: "Daniel",   // professional British male voice
      outputPath: audioPath,
    });
    console.log(`   ✓ Voiceover saved to public/audio/pm-voiceover.mp3\n`);
  } catch (err) {
    console.error(`   ✗ Voiceover failed: ${err}`);
    console.log("   Continuing without voiceover — video will render silently.\n");
  }

  // ── Solution background image ──────────────────────────────────────────────
  console.log("2/2 Generating solution background (nano-banana-pro)...");
  const imgPath = path.resolve(__dirname, "../../public/pm-solution-bg.jpg");
  try {
    const imageUrl = await generateImage({
      prompt: `Professional property management office scene, Greater Manchester UK.
               Confident property manager reviewing documents at a clean modern desk,
               warm interior lighting, blurred background, cinematic depth of field,
               dark navy and cream tones, photorealistic, no text`,
      width: 1080,
      height: 1920,
    });

    // Download and save locally so Remotion can use it as a static asset
    const res = await fetch(imageUrl);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(imgPath, Buffer.from(buffer));
    console.log(`   ✓ Background image saved to public/pm-solution-bg.jpg\n`);
  } catch (err) {
    console.error(`   ✗ Image generation failed: ${err}`);
    console.log("   Continuing — solution scene will use solid colour fallback.\n");
  }

  console.log("Done. Run `npm run dev` to preview, or `npm run build:pm` to render.");
}

main().catch(console.error);
