import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { BRAND } from "../data";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 0.8 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(frame, [0, 0.8 * fps], [0.7, 1], {
    extrapolateRight: "clamp",
  });

  const ctaOpacity = interpolate(frame, [1 * fps, 1.6 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const ctaY = interpolate(frame, [1 * fps, 1.6 * fps], [30, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const contactOpacity = interpolate(
    frame,
    [1.8 * fps, 2.4 * fps],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const lineWidth = interpolate(frame, [0.8 * fps, 1.6 * fps], [0, 300], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
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
      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 50,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{ width: 450, objectFit: "contain" }}
        />
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          backgroundColor: BRAND.gold,
          marginBottom: 50,
        }}
      />

      {/* CTA */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: BRAND.white,
            fontSize: 44,
            fontWeight: 900,
            marginBottom: 12,
          }}
        >
          Ready to Invest?
        </div>
        <div
          style={{
            color: BRAND.cream,
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.6,
          }}
        >
          Partner with us for 8-12.5%{"\n"}fixed returns
        </div>
      </div>

      {/* Contact details */}
      <div
        style={{
          opacity: contactOpacity,
          marginTop: 60,
          textAlign: "center",
        }}
      >
        <div
          style={{
            backgroundColor: BRAND.gold,
            color: BRAND.darkNavy,
            padding: "18px 50px",
            borderRadius: 10,
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 24,
          }}
        >
          Get in Touch
        </div>

        <div
          style={{
            color: BRAND.cream,
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          sam@sjbproperty.com
        </div>
        <div
          style={{
            color: BRAND.cream,
            fontSize: 22,
            fontWeight: 400,
            opacity: 0.7,
          }}
        >
          sjbpropertygroup.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
