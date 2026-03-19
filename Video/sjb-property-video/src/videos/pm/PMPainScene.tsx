import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { BRAND } from "../../data";

interface PainPoint {
  icon: string;
  title: string;
  subtitle: string;
}

interface PMPainSceneProps {
  imageUrl: string;
  painPoints: PainPoint[];
  sceneLabel: string;
}

export const PMPainScene: React.FC<PMPainSceneProps> = ({
  imageUrl,
  painPoints,
  sceneLabel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imageScale = interpolate(frame, [0, 5 * fps], [1, 1.12], {
    extrapolateRight: "clamp",
  });

  const logoOpacity = interpolate(frame, [0, 0.4 * fps], [0, 0.8], {
    extrapolateRight: "clamp",
  });

  const labelOpacity = interpolate(frame, [0.2 * fps, 0.7 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* Property photo — Ken Burns */}
      <AbsoluteFill>
        <Img
          src={imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${imageScale})`,
          }}
        />
      </AbsoluteFill>

      {/* Dark overlay — heavier at bottom */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(10,18,26,0.5) 0%,
            rgba(10,18,26,0.2) 30%,
            rgba(10,18,26,0.7) 60%,
            rgba(10,18,26,0.95) 100%
          )`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 40,
          opacity: logoOpacity,
        }}
      >
        <Img src={staticFile("logo.png")} style={{ width: 180, objectFit: "contain" }} />
      </div>

      {/* Scene label badge */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 50,
          opacity: labelOpacity,
          backgroundColor: "rgba(201,168,76,0.15)",
          border: `1px solid ${BRAND.gold}`,
          color: BRAND.gold,
          padding: "10px 22px",
          borderRadius: 6,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {sceneLabel}
      </div>

      {/* Pain points */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 50,
          right: 50,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {painPoints.map((pain, i) => {
          const delay = 0.3 + i * 0.45;
          const painOpacity = interpolate(
            frame,
            [delay * fps, (delay + 0.5) * fps],
            [0, 1],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          );
          const painX = interpolate(
            frame,
            [delay * fps, (delay + 0.5) * fps],
            [-50, 0],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          );

          return (
            <div
              key={pain.title}
              style={{
                opacity: painOpacity,
                transform: `translateX(${painX}px)`,
                display: "flex",
                alignItems: "center",
                gap: 20,
                backgroundColor: "rgba(10,18,26,0.75)",
                backdropFilter: "blur(12px)",
                borderLeft: `4px solid #c0392b`,
                borderRadius: "0 10px 10px 0",
                padding: "18px 24px",
              }}
            >
              <span style={{ fontSize: 40 }}>{pain.icon}</span>
              <div>
                <div
                  style={{
                    color: BRAND.white,
                    fontSize: 34,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    marginBottom: 4,
                  }}
                >
                  {pain.title}
                </div>
                <div
                  style={{
                    color: BRAND.cream,
                    fontSize: 22,
                    fontWeight: 400,
                    opacity: 0.8,
                  }}
                >
                  {pain.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
