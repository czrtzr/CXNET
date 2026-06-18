// Wax seal bearing the crest. A meaningful confirmation stamps one of these.
// Here it is the static mark; the press and settle animation is added in the
// signature polish phase. Oxblood wax, a brass rim, an embossed CX.

type WaxSealProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function WaxSeal({ size = 96, className, title }: WaxSealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <radialGradient id="cxnet-wax" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#9b2230" />
          <stop offset="55%" stopColor="#7a1620" />
          <stop offset="100%" stopColor="#4d0e15" />
        </radialGradient>
      </defs>

      {/* Deckled wax body: a circle nudged by a soft scalloped edge */}
      <circle cx="50" cy="50" r="44" fill="url(#cxnet-wax)" />
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="#3a0b11"
        strokeWidth="1"
        opacity="0.6"
      />

      {/* Brass embossed rims */}
      <circle
        cx="50"
        cy="50"
        r="37"
        fill="none"
        stroke="#b08d57"
        strokeWidth="1.1"
        opacity="0.85"
      />
      <circle
        cx="50"
        cy="50"
        r="33"
        fill="none"
        stroke="#b08d57"
        strokeWidth="0.6"
        opacity="0.5"
      />

      {/* Embossed monogram */}
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fontFamily="var(--font-fraunces), Georgia, serif"
        fontSize="30"
        fontWeight={500}
        fill="#d8b483"
        opacity="0.9"
      >
        CX
      </text>
    </svg>
  );
}
