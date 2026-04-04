import { GoogleGenerativeAI } from "@google/generative-ai";
import { properties, managementServices } from "./data";

/**
 * Uses the Gemini API to generate enhanced property descriptions
 * and marketing copy for the video. Call this before rendering
 * to pre-generate content, then pass it as props.
 *
 * Usage:
 *   GEMINI_API_KEY=your-key npx ts-node src/generate-content.ts
 */
export async function generatePropertyContent(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a UK property investment copywriter for SJB Property Group,
a company based in Greater Manchester specialising in buy-to-let (BTL) and
House in Multiple Occupation (HMO) properties.

Generate short, punchy marketing descriptions (max 15 words each) for these properties
to overlay on a video. Return JSON only, no markdown.

Properties:
${properties.map((p) => `- ${p.name}: ${p.type}, rent ${p.rent}, ROI ${p.roi}`).join("\n")}

Also generate:
1. A tagline for the property management service (max 10 words)
2. A call-to-action line (max 12 words)

Services offered: ${managementServices.join(", ")}

Return format:
{
  "properties": [{ "name": "...", "description": "..." }],
  "managementTagline": "...",
  "cta": "..."
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip any markdown code fences
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}
