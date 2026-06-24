"use client";

import { motion, useReducedMotion } from "motion/react";

// The financial pulse: an engraved heartbeat line that etches itself on, then a
// brighter segment travels along it forever, like a live readout. Inherits color
// from the parent (set text-brass / text-red). A signature flourish reused across
// hero sections so every screen shares one quiet sign of life. Reduced motion
// shows the finished line, still, with no traveling pulse.
const HEARTBEAT =
  "M0 20 H78 l7 -3 6 -13 7 26 6 -22 5 12 6 0 H148 l6 5 4 -5 H300";

export function PulseLine({
  width = 300,
  height = 40,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 40"
      fill="none"
      className={className}
      aria-hidden
      preserveAspectRatio="none"
    >
      {/* Faint engraved baseline that draws itself on. */}
      <motion.path
        d={HEARTBEAT}
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.28}
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 1.8, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* A bright pulse segment that runs along the same trace, on a loop. */}
      {reduce ? null : (
        <motion.path
          d={HEARTBEAT}
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pathLength: 0.16 }}
          initial={{ pathOffset: 0, opacity: 0 }}
          animate={{ pathOffset: [0, 1], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            repeatDelay: 1.1,
            ease: "easeInOut",
            delay: 1.6,
          }}
        />
      )}
    </svg>
  );
}
