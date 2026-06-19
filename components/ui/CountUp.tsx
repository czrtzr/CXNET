"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { formatCurrency, formatNumber } from "@/lib/finance/format";
import { Quietable } from "@/components/layout/QuietMode";
import { cn } from "@/lib/utils/cn";

// A figure that counts from its previous value to the next on mount and on
// change, easing out. Money or plain number. Tabular figures so the width does
// not jitter as digits roll. Reduced motion shows the final value at once.
export function CountUp({
  value,
  currency,
  decimals = 2,
  signed = false,
  tone = "auto",
  quiet = false,
  duration = 0.9,
  className,
}: {
  value: number;
  currency?: string;
  decimals?: number;
  signed?: boolean;
  tone?: "auto" | "pos" | "neg" | "muted" | "plain";
  quiet?: boolean;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // Start at zero so the first paint counts up; reduced motion ignores this and
  // renders the value directly below.
  const [display, setDisplay] = useState(() => (reduce ? value : 0));
  const fromRef = useRef(reduce ? value : 0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, reduce]);

  const shown = reduce ? value : display;
  const text = currency
    ? formatCurrency(shown, currency, { signed })
    : formatNumber(shown, decimals);

  const toneClass =
    tone === "pos"
      ? "text-pos"
      : tone === "neg"
        ? "text-neg"
        : tone === "muted"
          ? "text-text-muted"
          : tone === "plain"
            ? undefined
            : value < 0
              ? "text-neg"
              : undefined;

  const span = <span className={cn("tabular-nums", toneClass, className)}>{text}</span>;
  return quiet ? <Quietable>{span}</Quietable> : span;
}
