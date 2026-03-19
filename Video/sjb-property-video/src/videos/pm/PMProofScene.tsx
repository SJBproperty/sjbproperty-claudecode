import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { BRAND, properties } from "../../data";

const STATS = [
  { value: "7", label: "Properties Managed" },
  { value: "100%", label: "Repayment Record" },
  { value: "£100K+", label: "Gross Rent / Year" },
  { value: "GM", label: "Greater Manchester" },
];

// Pick 3 strong portfolio images
const SHOWCASE_PROPERTIES = [
  properties[1], // Cheadle HMO — highest rent
  properties[0], // Vienna BTL — best ROI
  properties[2], // Gradwell HMO
];

export const PMProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 0.6 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const headerY = interpolate(frame, [0, 0.6 * fps], [-30, 0], {
    extrapolateRight: "clamp",
  });

  const logoOpacity = interpolate(frame, [0, 0.5 * fps], [0, 0.85], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.darkNavy }}>

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          top: 55,
          right: 40,
          opacity: logoOpacity,
          zIndex: 10,
        }}
      >
        <Img src={staticFile("logo.png")} style={{ width: 160, objectFit: "contain" }} />
      </div>

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 50,
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <div
          style={{
            color: BRAND.gold,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 5,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Our Portfolio
        </div>
        <div
          style={{
            color: BRAND.white,
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1.0,
          }}
        >
          The track record
        </div>
        <div
          style={{
            color: BRAND.cream,
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1.0,
            opacity: 0.7,
          }}
        >
          speaks for itself.
        </div>
      </div>

      {/* Property image strip */}
      <div
        style={{
          position: "absolute",
          top: 280,
          left: 0,
          right: 0,
          height: 680,
          display: "flex",
          gap: 6,
          padding: "0 6px",
        }}
      >
        {SHOWCASE_PROPERTIES.map((property, i) => {
          const delay = 0.4 + i * 0.25;
          const imgOpacity = interpolate(
            frame,
            [delay * fps, (delay + 0.5) * fps],
            [0, 1],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          );
          const imgScale = interpolate(
            frame,
            [delay * fps, (delay + 0.5) * fps],
            [1.1, 1],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          );
          // Slow Ken Burns on each
          const kenBurns = interpolate(frame, [0, 5 * fps], [1, 1.05], {
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={property.name}
              style={{
                flex: 1,
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
                opacity: imgOpacity,
                transform: `scale(${imgScale})`,
              }}
            >
              <Img
                src={property.image}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `scale(${kenBurns})`,
                }}
              />
              {/* Property label */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "linear-gradient(to top, rgba(10,18,26,0.95) 0%, transparent 100%)",
                  padding: "40px 14px 16px",
                }}
              >
                <div
                  style={{
                    color: BRAND.gold,
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: 1,
                  }}
                >
                  {property.type}
                </div>
                <div
                  style={{
                    color: BRAND.white,
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {property.name}
                </div>
                <div
                  style={{
                    color: BRAND.cream,
                    fontSize: 17,
                    fontWeight: 600,
                    opacity: 0.9,
                    marginTop: 2,
                  }}
                >
                  {property.rent}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 30,
          right: 30,
          display: "flex",
          gap: 12,
        }}
      >
        {STATS.map((stat, i) => {
          const delay = 0.8 + i * 0.2;
          const statOpacity = interpolate(
            frame,
            [delay * fps, (delay + 0.4) * fps],
            [0, 1],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          );
          const statY = interpolate(
            frame,
            [delay * fps, (delay + 0.4) * fps],
            [20, 0],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          );

          return (
            <div
              key={stat.label}
              style={{
                flex: 1,
                opacity: statOpacity,
                transform: `translateY(${statY}px)`,
                backgroundColor: "rgba(201,168,76,0.12)",
                border: `1px solid rgba(201,168,76,0.4)`,
                borderRadius: 10,
                padding: "16px 10px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: BRAND.gold,
                  fontSize: 32,
                  fontWeight: 900,
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  color: BRAND.cream,
                  fontSize: 15,
                  fontWeight: 500,
                  opacity: 0.8,
                  lineHeight: 1.2,
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
