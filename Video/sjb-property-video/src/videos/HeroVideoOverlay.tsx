/**
 * SJB Property Group — Hero Video Overlay
 * 30 seconds | 1080×1920 | 30fps
 *
 * Sequence:
 *   0–3s    Logo intro      Large SJB logo reveal on dark background + music starts
 *   3–25s   Hero video      "hero video completed .mp4" plays with white overlay text
 *             ├ 0.5–7s      Headline:  "Your Property. Our Problem."
 *             ├ 7.5–14s     Services:  Full Management · Tenant Find · Guaranteed Rent · Compliance
 *             ├ 14.5–21s    Value prop: "Hands-off landlord. Full returns."
 *             └ 21–25s      CTA:       DM "MANAGE" · sjbpropertygroup.com · biosite
 *   25–30s  Outro           Logo outro (same animation as intro, reversed feel)
 */

import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { BRAND } from "../data";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

// ─── Logo Scene (used for both intro and outro) ──────────────────────────────

const LogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, Math.round(0.7 * fps)], [0, 1], {
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(frame, [0, Math.round(1.2 * fps)], [0.72, 1], {
    extrapolateRight: "clamp",
  });

  const lineScale = interpolate(
    frame,
    [Math.round(0.6 * fps), Math.round(1.4 * fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const labelOpacity = interpolate(
    frame,
    [Math.round(1.0 * fps), Math.round(1.8 * fps)],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const labelY = interpolate(
    frame,
    [Math.round(1.0 * fps), Math.round(1.8 * fps)],
    [22, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.darkNavy,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
      }}
    >
      {/* Radial vignette for cinematic depth */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Subtle gold grid texture */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 100px,
              rgba(201,168,76,0.03) 100px, rgba(201,168,76,0.03) 101px),
            repeating-linear-gradient(90deg, transparent, transparent 100px,
              rgba(201,168,76,0.03) 100px, rgba(201,168,76,0.03) 101px)
          `,
        }}
      />

      {/* Large SJB logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{ width: 560, objectFit: "contain" }}
        />

        {/* Gold divider line */}
        <div
          style={{
            width: 130,
            height: 2,
            backgroundColor: BRAND.gold,
            marginTop: 36,
            transform: `scaleX(${lineScale})`,
            transformOrigin: "center",
          }}
        />

        {/* Sub-label */}
        <div
          style={{
            opacity: labelOpacity,
            transform: `translateY(${labelY}px)`,
            marginTop: 26,
            color: "rgba(255,255,255,0.75)",
            fontSize: 24,
            fontWeight: 300,
            letterSpacing: 8,
            textTransform: "uppercase" as const,
            textAlign: "center" as const,
          }}
        >
          Property Management
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Logo Watermark (persistent top-left) ────────────────────────────────────

const LogoWatermark: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 15],
    [0, 0.85],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 50,
        left: 50,
        opacity,
        zIndex: 10,
      }}
    >
      <Img
        src={staticFile("logo.png")}
        style={{ width: 120, objectFit: "contain" }}
      />
    </div>
  );
};

// ─── Fade Text Overlay Helper ────────────────────────────────────────────────

interface FadeTextProps {
  children: React.ReactNode;
  inFrame: number;
  outFrame: number;
  style?: React.CSSProperties;
}

const FadeText: React.FC<FadeTextProps> = ({ children, inFrame, outFrame, style }) => {
  const frame = useCurrentFrame();
  const FADE = 14;

  const opacity = interpolate(
    frame,
    [inFrame, inFrame + FADE, outFrame - FADE, outFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const translateY = interpolate(frame, [inFrame, inFrame + FADE], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
};

// ─── Text shadow for legibility ──────────────────────────────────────────────

const TEXT_SHADOW = "0 2px 16px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.7)";
const TEXT_SHADOW_LIGHT = "0 1px 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.5)";

// ─── Hero Video with Overlays ────────────────────────────────────────────────

const HeroWithOverlays: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const f = (s: number) => Math.round(s * fps);

  // Overlay timing (relative to hero scene start = frame 0)
  const OV1_IN = f(0.5);  const OV1_OUT = f(7);
  const OV2_IN = f(7.5);  const OV2_OUT = f(14);
  const OV3_IN = f(14.5); const OV3_OUT = f(21);
  const CTA_IN = f(21);   const CTA_OUT = f(25);

  return (
    <AbsoluteFill style={{ fontFamily }}>

      {/* ── Hero video ──────────────────────────────────────────────── */}
      <OffthreadVideo
        src={staticFile("hero video completed .mp4")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* ── Stronger gradient scrim for text legibility ──────────────── */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            180deg,
            rgba(0,0,0,0.70) 0%,
            rgba(0,0,0,0.15) 25%,
            rgba(0,0,0,0.15) 55%,
            rgba(0,0,0,0.75) 100%
          )`,
        }}
      />

      {/* ── Logo watermark — top left, persistent ─────────────────── */}
      <LogoWatermark startFrame={0} />

      {/* ── Overlay 1: Headline (0.5s – 7s) ─────────────────────────── */}
      <FadeText
        inFrame={OV1_IN}
        outFrame={OV1_OUT}
        style={{
          position: "absolute",
          top: 340,
          left: 0,
          right: 0,
          padding: "0 64px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: BRAND.gold,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 6,
            textTransform: "uppercase" as const,
            marginBottom: 22,
            textShadow: TEXT_SHADOW,
          }}
        >
          Property Management
        </div>

        <div
          style={{
            color: "#ffffff",
            fontSize: 82,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -1,
            textShadow: TEXT_SHADOW,
          }}
        >
          Your Property.
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: 82,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -1,
            marginBottom: 28,
            textShadow: TEXT_SHADOW,
          }}
        >
          Our Problem.
        </div>

        <div
          style={{
            width: 70,
            height: 3,
            backgroundColor: BRAND.gold,
            margin: "0 auto",
            boxShadow: "0 0 12px rgba(201,168,76,0.5)",
          }}
        />
      </FadeText>

      {/* ── Overlay 2: Services list (7.5s – 14s) ───────────────────── */}
      <FadeText
        inFrame={OV2_IN}
        outFrame={OV2_OUT}
        style={{
          position: "absolute",
          top: 280,
          left: 0,
          right: 0,
          padding: "0 70px",
        }}
      >
        <div
          style={{
            color: BRAND.gold,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 6,
            textTransform: "uppercase" as const,
            marginBottom: 36,
            textShadow: TEXT_SHADOW,
          }}
        >
          What We Handle
        </div>

        {[
          { title: "Full Management",       sub: "End-to-end operations, zero effort on your part" },
          { title: "Tenant Find & Vetting", sub: "Quality tenants placed and vetted" },
          { title: "Guaranteed Rent",        sub: "3–10 year agreements available" },
          { title: "Compliance & Safety",    sub: "HMO licences, deposits, certificates" },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              marginBottom: 26,
              paddingLeft: 24,
              borderLeft: `3px solid ${BRAND.gold}`,
            }}
          >
            <div
              style={{
                color: "#ffffff",
                fontSize: 38,
                fontWeight: 800,
                lineHeight: 1.2,
                textShadow: TEXT_SHADOW,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 23,
                fontWeight: 400,
                letterSpacing: 0.4,
                marginTop: 2,
                textShadow: TEXT_SHADOW_LIGHT,
              }}
            >
              {item.sub}
            </div>
          </div>
        ))}
      </FadeText>

      {/* ── Overlay 3: Value prop (14.5s – 21s) ─────────────────────── */}
      <FadeText
        inFrame={OV3_IN}
        outFrame={OV3_OUT}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 70px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: "uppercase" as const,
            marginBottom: 28,
            textShadow: TEXT_SHADOW_LIGHT,
          }}
        >
          The SJB Approach
        </div>

        <div style={{ color: "#ffffff", fontSize: 74, fontWeight: 900, lineHeight: 1.1, textShadow: TEXT_SHADOW }}>
          Hands-off landlord.
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: 74,
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 36,
            textShadow: TEXT_SHADOW,
          }}
        >
          Full returns.
        </div>

        <div
          style={{
            width: 60,
            height: 3,
            backgroundColor: BRAND.gold,
            marginBottom: 32,
            boxShadow: "0 0 12px rgba(201,168,76,0.5)",
          }}
        />

        <div
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: 29,
            fontWeight: 400,
            lineHeight: 1.55,
            maxWidth: 860,
            textShadow: TEXT_SHADOW_LIGHT,
          }}
        >
          We manage your portfolio so you don't have to — whether you're in Manchester
          or{" "}
          <span style={{ color: BRAND.gold, fontWeight: 700 }}>anywhere in the world.</span>
        </div>
      </FadeText>

      {/* ── CTA (21s – 25s) ─────────────────────────────────────────── */}
      <FadeText
        inFrame={CTA_IN}
        outFrame={CTA_OUT}
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          padding: "0 64px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: BRAND.gold,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 4,
            textTransform: "uppercase" as const,
            marginBottom: 24,
            textShadow: TEXT_SHADOW,
          }}
        >
          DM "MANAGE" to get started
        </div>

        <div
          style={{
            width: 60,
            height: 2,
            backgroundColor: "rgba(255,255,255,0.25)",
            margin: "0 auto 24px auto",
          }}
        />

        <div
          style={{
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: 2,
            marginBottom: 12,
            textShadow: TEXT_SHADOW_LIGHT,
          }}
        >
          sjbpropertygroup.com
        </div>

        <div
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: 2,
            textShadow: TEXT_SHADOW_LIGHT,
          }}
        >
          bio.site/sjbproperty
        </div>
      </FadeText>

    </AbsoluteFill>
  );
};

// ─── Main Composition ────────────────────────────────────────────────────────

export const HeroVideoOverlay: React.FC = () => {
  const { fps } = useVideoConfig();

  const TRANSITION    = Math.round(0.5 * fps); // 15 frames
  const introDuration = Math.round(3 * fps);   // 3s = 90 frames (shortened from 4s)
  const outroDuration = Math.round(3 * fps);   // 3s = 90 frames
  const heroDuration  = 900 - introDuration - outroDuration - TRANSITION * 2; // ~22s

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.darkNavy, fontFamily }}>
      {/* ── Background music — starts from frame 0 (logo intro) ─── */}
      {/* Drop an MP3 into public/audio/bg-music.mp3 to enable */}
      {/* <Audio src={staticFile("audio/bg-music.mp3")} volume={0.3} /> */}

      <TransitionSeries>
        {/* ── Logo Intro (3s) ─────────────────────────────────────── */}
        <TransitionSeries.Sequence durationInFrames={introDuration}>
          <LogoScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* ── Hero Video with Overlays ────────────────────────────── */}
        <TransitionSeries.Sequence durationInFrames={heroDuration}>
          <HeroWithOverlays />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* ── Logo Outro (3s) — same animation as intro ───────────── */}
        <TransitionSeries.Sequence durationInFrames={outroDuration}>
          <LogoScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
