import { Composition, staticFile } from "remotion";
import { getVideoMetadata } from "@remotion/media-utils";
import { PropertyShowcase } from "./PropertyShowcase";
import { PropertyManagementVideo } from "./videos/PropertyManagementVideo";
import { HeroVideoOverlay } from "./videos/HeroVideoOverlay";
import { z } from "zod";

const FPS = 30;
const LOGO_SECONDS = 3;
const TRANSITION_FRAMES = Math.round(0.5 * FPS);

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

      {/* Hero Video — logo intro + clean hero + logo outro */}
      <Composition
        id="HeroVideoOverlay"
        component={HeroVideoOverlay}
        durationInFrames={900}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={async () => {
          const meta = await getVideoMetadata(
            staticFile("hero video completed .mp4")
          );
          const videoFrames = Math.round(meta.durationInSeconds * FPS);
          const logoFrames = LOGO_SECONDS * FPS * 2; // intro + outro
          const transitionOverlap = TRANSITION_FRAMES * 2;
          return {
            durationInFrames: videoFrames + logoFrames - transitionOverlap,
          };
        }}
      />
    </>
  );
};
