import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  wavespeed: {
    apiKey: process.env.WAVESPEED_API_KEY ?? "",
    baseUrl: "https://api.wavespeed.ai/api/v3",
    models: {
      image:       process.env.WAVESPEED_IMAGE_MODEL        ?? "google/nano-banana-pro/text-to-image",
      imageFast:   process.env.WAVESPEED_IMAGE_MODEL_FAST   ?? "google/nano-banana-2/text-to-image-fast",
      tts:         process.env.WAVESPEED_TTS_MODEL          ?? "elevenlabs/eleven-v3",
      ttsFast:     process.env.WAVESPEED_TTS_MODEL_FAST     ?? "elevenlabs/flash-v2.5",
      voiceClone:  process.env.WAVESPEED_VOICE_CLONE_MODEL  ?? "minimax/voice-clone",
      video:       process.env.WAVESPEED_VIDEO_MODEL        ?? "wavespeed-ai/kling-2-0",
      avatar:      process.env.WAVESPEED_AVATAR_MODEL        ?? "wavespeed-ai/infinitetalk",
      avatarShort: process.env.WAVESPEED_AVATAR_MODEL_SHORT ?? "wavespeed-ai/skyreels-v3-talking-avatar",
    },
  },
};

export function requireKey(key: string, name: string): string {
  if (!key) throw new Error(`Missing API key: ${name}. Add it to sjb-property-video/.env`);
  return key;
}
