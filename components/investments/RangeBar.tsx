"use client";

import { motion, useReducedMotion } from "motion/react";
import { rangePosition } from "@/lib/finance/calculations";
import { formatCurrency } from "@/lib/finance/format";

// The 52 week band with a marker that slides to where the current price sits.
export function RangeBar({
  price,
  low,
  high,
  currency,
}: {
  price: number | null;
  low: number | null;
  high: number | null;
  currency: string;
}) {
  const reduce = useReducedMotion();
  const pos = rangePosition(price, low, high);
  if (pos == null || low == null || high == null) return null;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-text-faint">
        52 week range
      </p>
      <div className="relative mt-3 h-1 rounded-full bg-surface-hover">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-neg/40 via-brass/30 to-pos/40" />
        <motion.div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bg-deep bg-brass shadow"
          initial={reduce ? false : { left: "0%" }}
          animate={{ left: `${pos}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs tabular-nums text-text-muted">
        <span>{formatCurrency(low, currency)}</span>
        <span>{formatCurrency(high, currency)}</span>
      </div>
    </div>
  );
}
