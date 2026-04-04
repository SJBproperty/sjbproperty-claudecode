/**
 * SJB Property Group — Hero Video
 * 1080×1920 | 30fps
 *
 * Sequence:
 *   0–3s       Logo intro (big logo, dark background, fade in)
 *   3s–end     Hero video (muted — original audio stripped)
 *   end–end+3s Logo outro (same as intro)
 *
 * Audio: "Kings of Street_1.mp4" plays from frame 0 across entire video
 */

import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { BRAND } from "../data";

// ─── Logo Scene (just the logo, no text) ────────────────────────────────────

const LogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, Math.round(0.7 * fps)], [0, 1], {
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(frame, [0, Math.round(1.2 * fps)], [0.8, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.darkNavy,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Radial vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{ width: 560, objectFit: "contain" }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ─── Hero Video (clean, no overlays) ────────────────────────────────────────

const HeroClean: React.FC = () => {
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile("hero video completed .mp4")}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

// ─── Main Composition ───────────────────────────────────────────────────────

export const HeroVideoOverlay: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();

  const TRANSITION = Math.round(0.5 * fps);     // 15 frames fade
  const logoDuration = Math.round(3 * fps);      // 3s each
  const heroDuration = durationInFrames - logoDuration * 2 - TRANSITION * 2;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.darkNavy }}>
      {/* ── Music — plays from frame 0 across entire video ─── */}
      <Audio src={staticFile("Kings of Street_1.mp4")} volume={0.35} />

      <TransitionSeries>
        {/* ── Logo Intro (3s) ─────────────────────────────── */}
        <TransitionSeries.Sequence durationInFrames={logoDuration}>
          <LogoScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* ── Hero Video (muted, clean) ───────────────────── */}
        <TransitionSeries.Sequence durationInFrames={heroDuration}>
          <HeroClean />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* ── Logo Outro (3s) ─────────────────────────────── */}
        <TransitionSeries.Sequence durationInFrames={logoDuration}>
          <LogoScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
