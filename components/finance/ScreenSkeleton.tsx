"use client";

import { motion, useReducedMotion } from "motion/react";
import { Skeleton } from "@/components/ui/Skeleton";

// Shared loading state for the data screens, shown by each route's loading.tsx
// while the server fetches. It mirrors the real layout (label, hero figure, then
// rows or cards) so the page does not jump when data arrives. Rows shimmer and
// stagger in; reduced motion shows them at rest.
export function ScreenSkeleton({
  label,
  variant = "list",
}: {
  label: string;
  variant?: "list" | "cards";
}) {
  const reduce = useReducedMotion();
  const count = variant === "cards" ? 4 : 6;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
        {label}
      </p>
      <Skeleton className="mt-3 h-11 w-56" />
      <Skeleton className="mt-2 h-3 w-32" />

      <div
        className={
          variant === "cards"
            ? "mt-8 grid gap-3 sm:grid-cols-2"
            : "mt-8 flex flex-col gap-2"
        }
      >
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.06 }}
          >
            <Skeleton className={variant === "cards" ? "h-40 w-full" : "h-16 w-full"} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
