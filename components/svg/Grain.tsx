// Grain and vignette. A fixed, non interactive overlay that sits above the
// background so the near-black has tooth and depth instead of looking flat.
// An SVG turbulence filter supplies the grain; a radial gradient darkens the
// edges. Pointer events are off so it never intercepts clicks.

export function Grain({ opacity = 0.035 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50"
      style={{ mixBlendMode: "overlay" }}
    >
      {/* Radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* Film grain */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <filter id="cxnet-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter="url(#cxnet-grain)"
          opacity={opacity}
        />
      </svg>
    </div>
  );
}
