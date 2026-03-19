import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { spring } from "remotion";
import { BRAND } from "../../data";

export const PMHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 0.6 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const lineScale = interpolate(frame, [0.5 * fps, 1.3 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const line2Scale = interpolate(frame, [1.0 * fps, 1.8 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const questionOpacity = interpolate(frame, [0.8 * fps, 1.4 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const questionY = interpolate(frame, [0.8 * fps, 1.4 * fps], [50, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const subOpacity = interpolate(frame, [1.6 * fps, 2.4 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const subY = interpolate(frame, [1.6 * fps, 2.4 * fps], [30, 0], {
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
      {/* Subtle grid texture overlay */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg, transparent, transparent 80px,
            rgba(201,168,76,0.04) 80px, rgba(201,168,76,0.04) 81px
          ), repeating-linear-gradient(
            90deg, transparent, transparent 80px,
            rgba(201,168,76,0.04) 80px, rgba(201,168,76,0.04) 81px
          )`,
        }}
      />

      {/* Logo top centre */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: logoOpacity,
        }}
      >
        <Img src={staticFile("logo.png")} style={{ width: 260, objectFit: "contain" }} />
      </div>

      {/* Main content */}
      <div style={{ textAlign: "center", width: "100%" }}>
        {/* Label */}
        <div
          style={{
            color: BRAND.gold,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            marginBottom: 32,
          }}
        >
          Property Management
        </div>

        {/* Gold divider */}
        <div
          style={{
            width: 80,
            height: 3,
            backgroundColor: BRAND.gold,
            margin: "0 auto 40px",
            transform: `scaleX(${lineScale})`,
            transformOrigin: "center",
          }}
        />

        {/* Hook question */}
        <div
          style={{
            opacity: questionOpacity,
            transform: `translateY(${questionY}px)`,
          }}
        >
          <div
            style={{
              color: BRAND.white,
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            Is your property
          </div>
          <div
            style={{
              color: BRAND.white,
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            actually working
          </div>
          <div
            style={{
              color: BRAND.gold,
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.1,
            }}
          >
            for you?
          </div>
        </div>

        {/* Bottom divider */}
        <div
          style={{
            width: 60,
            height: 3,
            backgroundColor: BRAND.cream,
            margin: "40px auto 0",
            opacity: 0.3,
            transform: `scaleX(${line2Scale})`,
            transformOrigin: "center",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
