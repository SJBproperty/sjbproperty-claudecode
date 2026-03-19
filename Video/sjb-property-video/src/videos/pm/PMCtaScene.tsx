import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { BRAND } from "../../data";

export const PMCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 0.8 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(frame, [0, 0.8 * fps], [0.75, 1], {
    extrapolateRight: "clamp",
  });

  const lineWidth = interpolate(frame, [0.6 * fps, 1.4 * fps], [0, 340], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const dmOpacity = interpolate(frame, [1.0 * fps, 1.7 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const dmScale = interpolate(frame, [1.0 * fps, 1.7 * fps], [0.8, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const wordOpacity = interpolate(frame, [1.5 * fps, 2.1 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const wordY = interpolate(frame, [1.5 * fps, 2.1 * fps], [30, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const siteOpacity = interpolate(frame, [2.2 * fps, 2.8 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Pulse effect on the DM button
  const pulse = interpolate(
    frame,
    [2 * fps, 2.5 * fps, 3 * fps, 3.5 * fps, 4 * fps],
    [1, 1.04, 1, 1.04, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.darkNavy,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Subtle vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 40,
        }}
      >
        <Img src={staticFile("logo.png")} style={{ width: 380, objectFit: "contain" }} />
      </div>

      {/* Gold divider */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          backgroundColor: BRAND.gold,
          marginBottom: 50,
        }}
      />

      {/* DM CTA button */}
      <div
        style={{
          opacity: dmOpacity,
          transform: `scale(${dmScale * pulse})`,
          backgroundColor: BRAND.gold,
          color: BRAND.darkNavy,
          padding: "28px 70px",
          borderRadius: 14,
          fontSize: 46,
          fontWeight: 900,
          letterSpacing: 6,
          textTransform: "uppercase",
          marginBottom: 36,
          textAlign: "center",
        }}
      >
        DM "MANAGE"
      </div>

      {/* Supporting text */}
      <div
        style={{
          opacity: wordOpacity,
          transform: `translateY(${wordY}px)`,
          textAlign: "center",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            color: BRAND.cream,
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.7,
            opacity: 0.85,
          }}
        >
          Let us manage your property.{"\n"}
          You focus on what matters.
        </div>
      </div>

      {/* Website */}
      <div
        style={{
          opacity: siteOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: BRAND.cream,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 1,
            opacity: 0.6,
          }}
        >
          sjbpropertygroup.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
