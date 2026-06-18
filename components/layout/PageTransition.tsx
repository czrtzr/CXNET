"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Coordinated fade and translate on page mount, with children able to stagger
// via the `staggerItem` variant below. Under reduced motion it renders the
// final state instantly.
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.32,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: reduce ? 0 : 0.05,
      }}
    >
      {children}
    </motion.div>
  );
}

// Opt in stagger for direct children of a PageTransition.
export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};
