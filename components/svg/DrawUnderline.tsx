"use client";

import { motion, useReducedMotion } from "motion/react";

// A single engraved stroke that draws itself under a heading, with a faint second
// hairline beneath it for the same twin-rule feel as the crest. Inherits color
// (set text-brass / text-leather). Reduced motion shows the finished rule.
export function DrawUnderline({
  width = 220,
  className,
  delay = 0.2,
}: {
  width?: number;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <svg
      width={width}
      height={10}
      viewBox="0 0 280 10"
      fill="none"
      className={className}
      aria-hidden
      preserveAspectRatio="none"
    >
      <motion.path
        d="M1 4 Q70 1 140 4 T279 3"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: reduce ? 0 : 0.9,
          delay: reduce ? 0 : delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      <motion.path
        d="M6 8 Q70 6 140 7.5 T272 7"
        stroke="currentColor"
        strokeWidth={0.7}
        strokeLinecap="round"
        opacity={0.45}
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: reduce ? 0 : 1.1,
          delay: reduce ? 0 : delay + 0.15,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
    </svg>
  );
}
