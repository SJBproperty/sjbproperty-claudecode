import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from "remotion";
import { BRAND } from "../data";

type Property = {
  name: string;
  image: string;
  purchasePrice: string;
  refurbCost: string;
  valuation: string;
  rent: string;
  roi: string;
  type: string;
};

export const PropertyScene: React.FC<{
  property: Property;
  index: number;
}> = ({ property, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ken Burns effect - slow zoom on the property image
  const imageScale = interpolate(frame, [0, 3.5 * fps], [1, 1.15], {
    extrapolateRight: "clamp",
  });

  const overlayOpacity = interpolate(frame, [0, 0.5 * fps], [0.2, 0.55], {
    extrapolateRight: "clamp",
  });

  const nameOpacity = interpolate(frame, [0.3 * fps, 0.8 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const nameX = interpolate(frame, [0.3 * fps, 0.8 * fps], [-60, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const badgeOpacity = interpolate(frame, [0.5 * fps, 1 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const detailsOpacity = interpolate(
    frame,
    [0.8 * fps, 1.4 * fps],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const detailsY = interpolate(frame, [0.8 * fps, 1.4 * fps], [30, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const rentOpacity = interpolate(frame, [1.2 * fps, 1.8 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const rentScale = interpolate(frame, [1.2 * fps, 1.8 * fps], [0.8, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const logoOpacity = interpolate(frame, [0, 0.5 * fps], [0, 0.7], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* Property Image with Ken Burns */}
      <AbsoluteFill>
        <Img
          src={property.image}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${imageScale})`,
          }}
        />
      </AbsoluteFill>

      {/* Dark gradient overlay */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(26, 38, 52, ${overlayOpacity * 0.5}) 0%,
            rgba(26, 38, 52, ${overlayOpacity * 0.3}) 40%,
            rgba(26, 38, 52, ${overlayOpacity * 0.8}) 70%,
            rgba(26, 38, 52, ${overlayOpacity * 1.2}) 100%
          )`,
        }}
      />

      {/* Watermark logo top-right */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 40,
          opacity: logoOpacity,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{ width: 180, objectFit: "contain" }}
        />
      </div>

      {/* Property type badge */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 50,
          opacity: badgeOpacity,
          backgroundColor: property.type === "HMO" ? BRAND.gold : BRAND.cream,
          color: BRAND.darkNavy,
          padding: "10px 24px",
          borderRadius: 6,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        {property.type}
      </div>

      {/* Bottom content area */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 50,
          right: 50,
        }}
      >
        {/* Property name */}
        <div
          style={{
            opacity: nameOpacity,
            transform: `translateX(${nameX}px)`,
            color: BRAND.white,
            fontSize: 56,
            fontWeight: 900,
            marginBottom: 16,
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}
        >
          {property.name}
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: interpolate(frame, [0.5 * fps, 1.2 * fps], [0, 200], {
              extrapolateRight: "clamp",
              extrapolateLeft: "clamp",
            }),
            height: 3,
            backgroundColor: BRAND.gold,
            marginBottom: 24,
          }}
        />

        {/* Details grid */}
        <div
          style={{
            opacity: detailsOpacity,
            transform: `translateY(${detailsY}px)`,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Purchase", value: property.purchasePrice },
            { label: "Refurb", value: property.refurbCost },
            { label: "Valuation", value: property.valuation },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: "rgba(26, 38, 52, 0.7)",
                backdropFilter: "blur(10px)",
                padding: "14px 20px",
                borderRadius: 8,
                borderLeft: `3px solid ${BRAND.gold}`,
              }}
            >
              <div
                style={{
                  color: BRAND.gold,
                  fontSize: 16,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  color: BRAND.white,
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Rent highlight */}
        <div
          style={{
            opacity: rentOpacity,
            transform: `scale(${rentScale})`,
            transformOrigin: "left center",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              backgroundColor: BRAND.gold,
              color: BRAND.darkNavy,
              padding: "16px 28px",
              borderRadius: 10,
              fontSize: 32,
              fontWeight: 900,
            }}
          >
            {property.rent}
          </div>
          <div
            style={{
              color: BRAND.cream,
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            ROI: {property.roi}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
