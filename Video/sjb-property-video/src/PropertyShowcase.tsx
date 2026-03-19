import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { z } from "zod";
import { IntroScene } from "./scenes/IntroScene";
import { PropertyScene } from "./scenes/PropertyScene";
import { StatsScene } from "./scenes/StatsScene";
import { ManagementScene } from "./scenes/ManagementScene";
import { OutroScene } from "./scenes/OutroScene";
import { properties } from "./data";
import { PropertyShowcaseSchema } from "./Root";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export const PropertyShowcase: React.FC<
  z.infer<typeof PropertyShowcaseSchema>
> = () => {
  const { fps } = useVideoConfig();

  const introDuration = 4 * fps;
  const propertyDuration = 3.5 * fps;
  const statsDuration = 4 * fps;
  const managementDuration = 5 * fps;
  const outroDuration = 4 * fps;
  const transitionDuration = Math.round(0.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a2634", fontFamily }}>
      <TransitionSeries>
        {/* Intro */}
        <TransitionSeries.Sequence durationInFrames={introDuration}>
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Property Scenes */}
        {properties.map((property, index) => (
          <>
            <TransitionSeries.Sequence
              key={property.name}
              durationInFrames={propertyDuration}
            >
              <PropertyScene property={property} index={index} />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
              presentation={
                index % 2 === 0
                  ? slide({ direction: "from-left" })
                  : fade()
              }
              timing={linearTiming({
                durationInFrames: transitionDuration,
              })}
            />
          </>
        ))}

        {/* Stats */}
        <TransitionSeries.Sequence durationInFrames={statsDuration}>
          <StatsScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Management Services */}
        <TransitionSeries.Sequence durationInFrames={managementDuration}>
          <ManagementScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Outro */}
        <TransitionSeries.Sequence durationInFrames={outroDuration}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
