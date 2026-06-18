// Procedural guilloche engine: the rosette line-work engraved on banknotes and
// share certificates. Fully deterministic (no random), so it renders the same
// on the server and client. Parameterized and reused as the login background,
// a watermark behind hero numbers, and empty-state art. Always low opacity,
// thin strokes, in the inherited text color (set text-brass or text-leather).

type GuillocheProps = {
  size?: number;
  className?: string;
  opacity?: number;
  strokeWidth?: number;
  // Nested rosettes woven together. More rings reads richer but costs paths.
  rings?: number;
  // Lobe counts for the two woven frequencies. Coprime values look best.
  petalsA?: number;
  petalsB?: number;
  // Slow rotation for the login background. Decorative only, and the global
  // reduced-motion rule disables it automatically.
  drift?: boolean;
};

// One rosette as a closed polar curve r(t) = base + a*cos(pA t) + b*cos(pB t).
function rosettePath(
  cx: number,
  cy: number,
  base: number,
  ampA: number,
  ampB: number,
  petalsA: number,
  petalsB: number,
  phase: number,
  steps = 720,
): string {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r =
      base + ampA * Math.cos(petalsA * t + phase) + ampB * Math.cos(petalsB * t);
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return `${d}Z`;
}

export function Guilloche({
  size = 480,
  className,
  opacity = 0.12,
  strokeWidth = 0.6,
  rings = 7,
  petalsA = 12,
  petalsB = 17,
  drift = false,
}: GuillocheProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxBase = size * 0.42;

  const paths: string[] = [];
  for (let k = 0; k < rings; k++) {
    const f = 1 - k / (rings + 2); // shrink inward
    const base = maxBase * f;
    const ampA = size * 0.05 * f;
    const ampB = size * 0.03 * f;
    const phase = (k / rings) * Math.PI; // weave the rings out of phase
    paths.push(
      rosettePath(cx, cy, base, ampA, ampB, petalsA, petalsB, phase),
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      aria-hidden
      role="presentation"
    >
      <g
        className={drift ? "cxnet-drift" : undefined}
        style={{ transformOrigin: "center" }}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity={opacity}
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
