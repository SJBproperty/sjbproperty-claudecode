import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { BRAND } from "../data";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = interpolate(frame, [0, 1 * fps], [0.5, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const logoOpacity = interpolate(frame, [0, 0.8 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const taglineOpacity = interpolate(
    frame,
    [1.2 * fps, 2 * fps],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const taglineY = interpolate(
    frame,
    [1.2 * fps, 2 * fps],
    [40, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const subtitleOpacity = interpolate(
    frame,
    [2.2 * fps, 3 * fps],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const lineWidth = interpolate(
    frame,
    [1.8 * fps, 2.8 * fps],
    [0, 300],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.darkNavy,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: "flex",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 500,
            objectFit: "contain",
          }}
        />
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          backgroundColor: BRAND.cream,
          marginBottom: 40,
          opacity: taglineOpacity,
        }}
      />

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          color: BRAND.cream,
          fontSize: 48,
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
        }}
      >
        Experts at Turning
      </div>
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          color: BRAND.gold,
          fontSize: 52,
          fontWeight: 900,
          textAlign: "center",
          letterSpacing: 2,
          marginTop: 8,
        }}
      >
        Houses into Homes
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          color: BRAND.cream,
          fontSize: 28,
          fontWeight: 400,
          textAlign: "center",
          marginTop: 30,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        Greater Manchester
      </div>
    </AbsoluteFill>
  );
};
