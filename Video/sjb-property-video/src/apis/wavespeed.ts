/**
 * WaveSpeed API — Central AI Hub
 * https://wavespeed.ai
 *
 * Handles all AI generation for SJB Property video projects:
 *   - Image generation      → google/nano-banana-pro/text-to-image
 *   - Image generation fast → google/nano-banana-2/text-to-image-fast
 *   - Video generation      → wavespeed-ai/kling-2-0
 *   - Voiceover (TTS)       → elevenlabs/eleven-v3
 *   - Voiceover (fast TTS)  → elevenlabs/flash-v2.5
 *   - AI voice cloning      → minimax/voice-clone
 *   - AI avatar video       → wavespeed-ai/skyreels-v3-talking-avatar
 *
 * All calls use WAVESPEED_API_KEY from .env
 * Models are configured via WAVESPEED_*_MODEL env vars
 */
import * as fs from "fs";
import { config, requireKey } from "../config";

// ─── Shared helpers ────────────────────────────────────────────────────────

function getKey() {
  return requireKey(config.wavespeed.apiKey, "WAVESPEED_API_KEY");
}

// WaveSpeed URL pattern: POST /api/v3/{model-id}  body: { inputs: {...} }
async function post(model: string, inputs: object) {
  const url = `${config.wavespeed.baseUrl}/${model}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(inputs),
  });
  if (!res.ok) throw new Error(`WaveSpeed [${model}] ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getRequest(pollUrl: string) {
  const res = await fetch(pollUrl, {
    headers: { Authorization: `Bearer ${getKey()}` },
  });
  if (!res.ok) throw new Error(`WaveSpeed poll ${res.status}: ${await res.text()}`);
  return res.json();
}

// WaveSpeed returns either an immediate result or a polling URL in data.urls.get.
// This handles both and always resolves to the output URL string.
async function extractOrPoll(data: any, pollMs = 3000): Promise<string> {
  // Immediate result
  const outputs = data?.data?.outputs ?? data?.outputs;
  if (Array.isArray(outputs) && outputs[0]) return outputs[0];

  // Async — use the poll URL provided in the response
  const pollUrl = data?.data?.urls?.get;
  const requestId = data?.data?.id ?? data?.id;
  if (!pollUrl) throw new Error(`WaveSpeed: no output and no poll URL in response: ${JSON.stringify(data)}`);

  console.log(`   queued (${requestId}) — polling...`);
  while (true) {
    await new Promise((r) => setTimeout(r, pollMs));
    const result = await getRequest(pollUrl);
    const status = result?.data?.status ?? result?.status;
    const out = result?.data?.outputs ?? result?.outputs;

    if ((status === "completed" || status === "succeeded") && Array.isArray(out) && out[0]) {
      console.log(`   done.`);
      return out[0];
    }
    if (status === "failed" || status === "error") {
      throw new Error(`WaveSpeed request ${requestId} failed: ${JSON.stringify(result)}`);
    }
    console.log(`   status: ${status}...`);
  }
}

// ─── Image Generation ──────────────────────────────────────────────────────

export interface GenerateImageOptions {
  prompt: string;
  /** defaults to WAVESPEED_IMAGE_MODEL (google/nano-banana-pro/text-to-image) */
  model?: string;
  /** set true to use WAVESPEED_IMAGE_MODEL_FAST instead */
  fast?: boolean;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  negativePrompt?: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const {
    prompt,
    fast = false,
    model = fast ? config.wavespeed.models.imageFast : config.wavespeed.models.image,
    width = 1080,
    height = 1920,
    numInferenceSteps = 28,
    guidanceScale = 3.5,
    negativePrompt = "",
  } = options;

  const data = await post(model, {
    prompt,
    negative_prompt: negativePrompt,
    width,
    height,
    num_inference_steps: numInferenceSteps,
    guidance_scale: guidanceScale,
    enable_safety_checker: true,
  });

  return extractOrPoll(data);
}

/** SJB-branded helper: generate a property background for a scene */
export async function generatePropertyBackground(
  propertyDescription: string,
  aspectRatio: "portrait" | "landscape" | "square" = "portrait"
): Promise<string> {
  const dimensions = {
    portrait:  { width: 1080, height: 1920 }, // Instagram Reels / TikTok
    landscape: { width: 1920, height: 1080 }, // YouTube
    square:    { width: 1080, height: 1080 }, // Instagram post
  }[aspectRatio];

  return generateImage({
    prompt: `Professional architectural photography of ${propertyDescription} in Greater Manchester, UK.
             Modern interior or exterior, warm natural lighting, clean minimalist staging,
             no people, photorealistic, high-end estate agent quality`,
    negativePrompt: "people, text, watermark, cartoon, illustration, blur",
    ...dimensions,
  });
}

// ─── Video Generation ──────────────────────────────────────────────────────

export interface GenerateVideoOptions {
  prompt: string;
  /** defaults to WAVESPEED_VIDEO_MODEL (wavespeed-ai/kling-2-0) */
  model?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  imageUrl?: string; // optional: image-to-video
}

export async function generateVideo(options: GenerateVideoOptions): Promise<string> {
  const {
    prompt,
    model = config.wavespeed.models.video,
    durationSeconds = 5,
    width = 480,
    height = 832,
    imageUrl,
  } = options;

  const inputs: Record<string, unknown> = {
    prompt,
    duration: durationSeconds,
    width,
    height,
  };
  if (imageUrl) inputs.image_url = imageUrl;

  const data = await post(model, inputs);
  return extractOrPoll(data);
}

// ─── Text-to-Speech / Voiceover ────────────────────────────────────────────

export interface GenerateVoiceoverOptions {
  text: string;
  /** defaults to WAVESPEED_TTS_MODEL (elevenlabs/eleven-v3) */
  model?: string;
  /** set true to use WAVESPEED_TTS_MODEL_FAST instead */
  fast?: boolean;
  voice?: string;   // voice name or ID
  speed?: number;   // 0.5–2.0
  outputPath?: string;
}

export async function generateVoiceover(options: GenerateVoiceoverOptions): Promise<string> {
  const {
    text,
    fast = false,
    model = fast ? config.wavespeed.models.ttsFast : config.wavespeed.models.tts,
    voice = "af_sarah",
    speed = 1.0,
    outputPath,
  } = options;

  const data = await post(model, { text, voice_id: voice, speed });
  const audioUrl = await extractOrPoll(data);

  if (outputPath) {
    const audioRes = await fetch(audioUrl);
    const buffer = await audioRes.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`Voiceover saved to ${outputPath}`);
  }

  return audioUrl;
}

// ─── AI Voice Clone ────────────────────────────────────────────────────────

export interface CloneVoiceOptions {
  text: string;
  referenceAudioUrl: string;  // URL to a sample of your voice (10–30s MP3/WAV)
  /** defaults to WAVESPEED_VOICE_CLONE_MODEL (minimax/voice-clone) */
  model?: string;
  outputPath?: string;
}

export async function generateWithClonedVoice(options: CloneVoiceOptions): Promise<string> {
  const {
    text,
    referenceAudioUrl,
    model = config.wavespeed.models.voiceClone,
    outputPath,
  } = options;

  const data = await post(model, {
    gen_text: text,
    ref_audio_url: referenceAudioUrl,
  });
  const audioUrl = await extractOrPoll(data);

  if (outputPath) {
    const audioRes = await fetch(audioUrl);
    const buffer = await audioRes.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`Cloned voice audio saved to ${outputPath}`);
  }

  return audioUrl;
}

// ─── AI Avatar Generation ──────────────────────────────────────────────────

export interface GenerateAvatarVideoOptions {
  imageUrl: string;           // Your photo URL (or local base64)
  audioUrl: string;           // Audio URL from generateVoiceover / generateWithClonedVoice
  /** defaults to WAVESPEED_AVATAR_MODEL (wavespeed-ai/infinitetalk) — long-form, high quality */
  model?: string;
  /** set true to use WAVESPEED_AVATAR_MODEL_SHORT (skyreels-v3) — faster, short clips */
  short?: boolean;
}

export async function generateAvatarVideo(options: GenerateAvatarVideoOptions): Promise<string> {
  const {
    imageUrl,
    audioUrl,
    short = false,
    model = short ? config.wavespeed.models.avatarShort : config.wavespeed.models.avatar,
  } = options;

  const data = await post(model, {
    image_url: imageUrl,
    audio_url: audioUrl,
  });
  return extractOrPoll(data);
}

// ─── Poll for async results ────────────────────────────────────────────────

export async function pollResult(requestId: string, pollMs = 3000): Promise<string> {
  return extractOrPoll({ data: { id: requestId } }, pollMs);
}
