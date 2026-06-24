"use client";

import { motion, useReducedMotion } from "motion/react";

// An engraved balance scale for the net-worth hero: the post and beam etch
// themselves on, then the beam settles to a slight tilt toward the heavier side
// (assets when net worth is positive, debts when negative). Pans hang from each
// arm. Decorative, inherits color (set text-brass). Reduced motion shows the
// finished, level scale.
export function BalanceBeam({
  tilt = 1,
  size = 132,
  className,
}: {
  // -1 .. 1; sign picks the side, magnitude is clamped to a gentle angle.
  tilt?: number;
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const angle = Math.max(-7, Math.min(7, tilt * 7));
  const height = Math.round(size * (78 / 132));

  // Pans drop from the beam ends; we draw them at rest and let the beam group
  // carry the tilt, so the cords stay vertical-ish without per-pan math.
  const pan = (cx: number) => (
    <g>
      <line x1={cx} y1="30" x2={cx} y2="44" stroke="currentColor" strokeWidth={1} />
      <path
        d={`M${cx - 11} 44 a11 6 0 0 0 22 0`}
        stroke="currentColor"
        strokeWidth={1.1}
        fill="none"
      />
    </g>
  );

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 132 78"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* Upright post + base, drawn on. */}
      <motion.g
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.line x1="66" y1="20" x2="66" y2="62" stroke="currentColor" strokeWidth={1.4} />
        <motion.line x1="52" y1="64" x2="80" y2="64" stroke="currentColor" strokeWidth={1.4} />
        <motion.path d="M66 20 l4 -5 -4 -3 -4 3 Z" stroke="currentColor" strokeWidth={1} fill="none" />
      </motion.g>

      {/* Beam + pans, settling to the tilt after the post draws. */}
      <motion.g
        style={{ originX: "66px", originY: "20px" }}
        initial={reduce ? false : { rotate: 0, opacity: 0 }}
        animate={{ rotate: reduce ? angle : [0, -angle * 0.6, angle], opacity: 1 }}
        transition={{
          opacity: { duration: 0.4, delay: reduce ? 0 : 0.9 },
          rotate: reduce
            ? { duration: 0 }
            : { duration: 1.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        <line x1="24" y1="20" x2="108" y2="20" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        {pan(24)}
        {pan(108)}
      </motion.g>
    </svg>
  );
}
