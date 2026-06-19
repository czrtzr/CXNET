"use client";

import { motion, useReducedMotion } from "motion/react";

// The crest, but engraved live: each stroke draws itself on (the shield, then
// the inner hairline, the crown, and the twin rules), and the CX monogram
// settles in last. Mirrors the geometry of components/svg/Crest.tsx. Under
// reduced motion it renders complete at once.
export function CrestReveal({ size = 54 }: { size?: number }) {
  const reduce = useReducedMotion();
  const height = Math.round(size * (80 / 64));

  const draw = (delay: number, duration: number) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration, delay, ease: "easeInOut" as const },
        };

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 64 80"
      fill="none"
      className="text-brass"
      role="img"
      aria-label="CXNET"
    >
      <title>CXNET</title>

      {/* Outer shield */}
      <motion.path
        d="M32 2.5 L59 11.5 V40 C59 58.4 47.2 70.4 32 77.5 C16.8 70.4 5 58.4 5 40 V11.5 Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        {...draw(0.1, 1.1)}
      />
      {/* Inner hairline */}
      <motion.path
        d="M32 8 L53.5 15.2 V39.4 C53.5 54.6 43.7 64.7 32 71.2 C20.3 64.7 10.5 54.6 10.5 39.4 V15.2 Z"
        stroke="currentColor"
        strokeWidth={0.75}
        opacity={0.5}
        strokeLinejoin="round"
        {...draw(0.5, 0.9)}
      />
      {/* Crown diamond */}
      <motion.path
        d="M32 16 l3 3 -3 3 -3 -3 Z"
        stroke="currentColor"
        strokeWidth={0.9}
        strokeLinejoin="round"
        {...draw(0.95, 0.5)}
      />
      {/* CX monogram settles in */}
      <motion.text
        x="32"
        y="48"
        textAnchor="middle"
        fontFamily="var(--font-fraunces), Georgia, serif"
        fontSize="22"
        fontWeight={500}
        letterSpacing="-0.5"
        fill="currentColor"
        initial={reduce ? false : { opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        CX
      </motion.text>
      {/* Twin rules */}
      <motion.path
        d="M20 56 H44"
        stroke="currentColor"
        strokeWidth={1}
        {...draw(1.15, 0.4)}
      />
      <motion.path
        d="M23 59 H41"
        stroke="currentColor"
        strokeWidth={0.6}
        opacity={0.5}
        {...draw(1.25, 0.35)}
      />
    </svg>
  );
}
