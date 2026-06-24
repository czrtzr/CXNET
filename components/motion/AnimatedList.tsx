"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE } from "./Reveal";

// A list whose items animate both onto and off the screen: each enters with a
// fade and rise, and on removal collapses its own height as it fades out, so the
// rows below glide up to fill the gap rather than snapping. `layout` keeps the
// remaining items in smooth motion. Reduced motion drops the transitions.
//
// Usage: wrap rows in <AnimatedList>, give each an <AnimatedItem key={id}>. The
// stable key is what lets AnimatePresence catch the exit.
export function AnimatedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  );
}

export function AnimatedItem({
  children,
  className,
  layout = true,
}: {
  children: ReactNode;
  className?: string;
  layout?: boolean;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      layout={layout}
      className={className}
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        scale: 0.97,
        transition: { duration: 0.28, ease: EASE },
      }}
      transition={{ duration: 0.42, ease: EASE }}
      style={{ overflow: "hidden" }}
    >
      {children}
    </motion.div>
  );
}
