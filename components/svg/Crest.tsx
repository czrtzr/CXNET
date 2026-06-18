// The CXNET crest. An engraved shield carrying the CX monogram, drawn in thin
// strokes that inherit the surrounding text color (set text-brass, text-leather,
// or text-text on the parent). This one mark drives the logo lockup, the
// favicon, the wax seal, and the loading indicator.

type CrestProps = {
  size?: number;
  className?: string;
  // Decorative by default. Pass a label to expose it to assistive tech.
  title?: string;
};

export function Crest({ size = 64, className, title }: CrestProps) {
  const height = Math.round(size * (80 / 64));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 64 80"
      fill="none"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}

      {/* Outer shield */}
      <path
        d="M32 2.5 L59 11.5 V40 C59 58.4 47.2 70.4 32 77.5 C16.8 70.4 5 58.4 5 40 V11.5 Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* Inner hairline, a hair inside the edge */}
      <path
        d="M32 8 L53.5 15.2 V39.4 C53.5 54.6 43.7 64.7 32 71.2 C20.3 64.7 10.5 54.6 10.5 39.4 V15.2 Z"
        stroke="currentColor"
        strokeWidth={0.75}
        opacity={0.5}
        strokeLinejoin="round"
      />

      {/* Crown accent: a small engraved diamond above the monogram */}
      <path
        d="M32 16 l3 3 -3 3 -3 -3 Z"
        stroke="currentColor"
        strokeWidth={0.9}
        strokeLinejoin="round"
      />

      {/* CX monogram, set in the serif for a certain refinement */}
      <text
        x="32"
        y="48"
        textAnchor="middle"
        fontFamily="var(--font-fraunces), Georgia, serif"
        fontSize="22"
        fontWeight={500}
        letterSpacing="-0.5"
        fill="currentColor"
      >
        CX
      </text>

      {/* Twin rule beneath the monogram */}
      <line x1="20" y1="56" x2="44" y2="56" stroke="currentColor" strokeWidth={1} />
      <line
        x1="23"
        y1="59"
        x2="41"
        y2="59"
        stroke="currentColor"
        strokeWidth={0.6}
        opacity={0.5}
      />
    </svg>
  );
}
