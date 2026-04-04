import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { BRAND, managementServices } from "../data";

export const ManagementScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 0.6 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const headerY = interpolate(frame, [0, 0.6 * fps], [-30, 0], {
    extrapolateRight: "clamp",
  });

  const descOpacity = interpolate(
    frame,
    [0.6 * fps, 1.2 * fps],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const lineWidth = interpolate(frame, [0.4 * fps, 1.2 * fps], [0, 400], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.darkNavy,
        padding: 60,
        justifyContent: "center",
      }}
    >
      {/* Background property image with heavy overlay */}
      <AbsoluteFill>
        <Img
          src="https://images.squarespace-cdn.com/content/v1/637482433642fa49623c4d62/1676097526909-G8MCVXEXC89Z9RZBTG4A/unsplash-image-rgJ1J8SDEAY.jpg"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.15,
          }}
        />
      </AbsoluteFill>

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{ width: 200, objectFit: "contain", opacity: headerOpacity }}
        />
      </div>

      {/* Content */}
      <div style={{ marginTop: 120, zIndex: 1 }}>
        {/* Section label */}
        <div
          style={{
            opacity: headerOpacity,
            transform: `translateY(${headerY}px)`,
            color: BRAND.gold,
            fontSize: 20,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 6,
            marginBottom: 16,
          }}
        >
          Our Services
        </div>

        {/* Title */}
        <div
          style={{
            opacity: headerOpacity,
            transform: `translateY(${headerY}px)`,
            color: BRAND.white,
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          Property{"\n"}Management
        </div>

        {/* Gold line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            backgroundColor: BRAND.gold,
            marginBottom: 30,
          }}
        />

        {/* Description */}
        <div
          style={{
            opacity: descOpacity,
            color: BRAND.cream,
            fontSize: 26,
            fontWeight: 400,
            lineHeight: 1.6,
            marginBottom: 50,
            maxWidth: 800,
          }}
        >
          Complete comfort and relaxation through comprehensive portfolio
          management. We handle everything so you don't have to.
        </div>

        {/* Service items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {managementServices.map((service, index) => {
            const delay = 1.2 + index * 0.3;
            const itemOpacity = interpolate(
              frame,
              [delay * fps, (delay + 0.4) * fps],
              [0, 1],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            );
            const itemX = interpolate(
              frame,
              [delay * fps, (delay + 0.4) * fps],
              [-40, 0],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            );

            return (
              <div
                key={service}
                style={{
                  opacity: itemOpacity,
                  transform: `translateX(${itemX}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "18px 24px",
                  backgroundColor: "rgba(201, 168, 76, 0.1)",
                  borderRadius: 10,
                  borderLeft: `3px solid ${BRAND.gold}`,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: BRAND.gold,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    color: BRAND.white,
                    fontSize: 26,
                    fontWeight: 600,
                  }}
                >
                  {service}
                </div>
              </div>
            );
          })}
        </div>

        {/* Affiliations note */}
        <div
          style={{
            opacity: interpolate(
              frame,
              [3.5 * fps, 4.2 * fps],
              [0, 0.7],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            ),
            marginTop: 40,
            color: BRAND.cream,
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          NRLA | PRS | ICO | DPS Registered
        </div>
      </div>
    </AbsoluteFill>
  );
};
