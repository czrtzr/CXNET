"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// A template re-mounts on every navigation (unlike a layout), so this wrapper
// replays a coordinated entrance each time you move between screens: the new
// screen lifts and fades in as one piece, over the persistent shell. Per-screen
// content then runs its own staggered reveals on top. Reduced motion snaps in.
export default function AppTemplate({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
