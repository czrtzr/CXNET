"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

// The house easing — a confident settle, used everywhere so motion reads as one
// language across screens.
export const EASE = [0.22, 1, 0.36, 1] as const;

// A single element that rises and fades in on mount. The default direction is a
// gentle lift; pass `from` to slide it in from a side instead. Reduced motion
// renders the final state with no transition.
export function Reveal({
  children,
  delay = 0,
  from = "up",
  distance = 12,
  duration = 0.5,
  className,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  from?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  className?: string;
} & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  const offset =
    from === "up"
      ? { y: distance }
      : from === "down"
        ? { y: -distance }
        : from === "left"
          ? { x: distance }
          : { x: -distance };

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: reduce ? 0 : duration, delay: reduce ? 0 : delay, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// A container that staggers its direct Reveal/RevealItem children in sequence.
export function RevealGroup({
  children,
  delay = 0,
  stagger = 0.06,
  className,
}: {
  children: ReactNode;
  delay?: number;
  stagger?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="shown"
      transition={{
        staggerChildren: reduce ? 0 : stagger,
        delayChildren: reduce ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}

// An item inside a RevealGroup; inherits the parent's stagger timing.
export function RevealItem({
  children,
  distance = 12,
  className,
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: distance },
        shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}
