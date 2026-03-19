import { Composition } from "remotion";
import { PropertyShowcase } from "./PropertyShowcase";
import { PropertyManagementVideo } from "./videos/PropertyManagementVideo";
import { HeroVideoOverlay } from "./videos/HeroVideoOverlay";
import { z } from "zod";

export const PropertyShowcaseSchema = z.object({
  geminiApiKey: z.string().optional(),
});

export type PropertyShowcaseProps = z.infer<typeof PropertyShowcaseSchema>;

export const RemotionRoot = () => {
  return (
    <>
      {/* Original portfolio showcase */}
      <Composition
        id="PropertyShowcase"
        component={PropertyShowcase}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        schema={PropertyShowcaseSchema}
        defaultProps={{ geminiApiKey: "" }}
      />

      {/* Property Management — Instagram Reel (30s) */}
      <Composition
        id="PropertyManagement"
        component={PropertyManagementVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* Hero Video Overlay — PM promo with logo intro (30s) */}
      <Composition
        id="HeroVideoOverlay"
        component={HeroVideoOverlay}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
