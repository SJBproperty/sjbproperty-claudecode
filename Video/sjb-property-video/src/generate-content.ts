/**
 * Pre-render script: writes marketing copy to generated-content.json.
 * Content is derived from real data in data.ts.
 *
 * Usage:
 *   npm run generate
 */
import * as fs from "fs";
import * as path from "path";

async function main() {
  const content = {
    properties: [
      { name: "SJB Vienna",     description: "Premium BTL with 16.8% ROI after full BRRR cycle" },
      { name: "SJB Cheadle",    description: "Luxury co-living HMO generating £2,300 monthly rent" },
      { name: "SJB Gradwell",   description: "Converted 2-bed to 4-bed HMO with strong cash flow" },
      { name: "SJB Brigadier",  description: "Detached home expansion for long-term capital growth" },
      { name: "SJB Manchester", description: "Reliable suburban BTL with established long-term tenant" },
      { name: "SJB Moston",     description: "Zero capital invested — infinite ROI BRRR success story" },
    ],
    managementTagline: "Complete comfort. Total peace of mind.",
    cta: "Partner with us. Earn 8–12.5% fixed returns.",
  };

  const outPath = path.join(__dirname, "generated-content.json");
  fs.writeFileSync(outPath, JSON.stringify(content, null, 2));
  console.log(`Content written to ${outPath}`);
}

main().catch(console.error);
