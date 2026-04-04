import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { BRAND, stats } from "../data";

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 0.6 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [0, 0.6 * fps], [-30, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.darkNavy,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Logo watermark */}
      <div style={{ position: "absolute", top: 60, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Img
          src={staticFile("logo.png")}
          style={{ width: 220, objectFit: "contain", opacity: 0.3 }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          color: BRAND.gold,
          fontSize: 22,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 6,
          marginBottom: 16,
        }}
      >
        Track Record
      </div>
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          color: BRAND.white,
          fontSize: 52,
          fontWeight: 900,
          textAlign: "center",
          marginBottom: 60,
        }}
      >
        Our Results Speak{"\n"}For Themselves
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
          width: "100%",
        }}
      >
        {stats.map((stat, index) => {
          const delay = 0.8 + index * 0.35;
          const statOpacity = interpolate(
            frame,
            [delay * fps, (delay + 0.5) * fps],
            [0, 1],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          );
          const statX = interpolate(
            frame,
            [delay * fps, (delay + 0.5) * fps],
            [index % 2 === 0 ? -80 : 80, 0],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          );

          return (
            <div
              key={stat.label}
              style={{
                opacity: statOpacity,
                transform: `translateX(${statX}px)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "rgba(240, 234, 214, 0.08)",
                padding: "30px 40px",
                borderRadius: 12,
                borderLeft: `4px solid ${BRAND.gold}`,
              }}
            >
              <div
                style={{
                  color: BRAND.cream,
                  fontSize: 28,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  color: BRAND.gold,
                  fontSize: 52,
                  fontWeight: 900,
                }}
              >
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
