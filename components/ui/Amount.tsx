"use client";

import { formatCurrency } from "@/lib/finance/format";
import { Quietable } from "@/components/layout/QuietMode";
import { cn } from "@/lib/utils/cn";

type Tone = "auto" | "pos" | "neg" | "muted" | "plain";

// The one way money renders in the UI. Wraps the formatter, applies tone color
// (negatives in oxblood by default), keeps tabular figures, and optionally hides
// behind quiet mode. Use this instead of formatting amounts inline.
export function Amount({
  value,
  currency,
  signed = false,
  tone = "auto",
  quiet = false,
  className,
}: {
  value: number;
  currency: string;
  signed?: boolean;
  tone?: Tone;
  quiet?: boolean;
  className?: string;
}) {
  const text = formatCurrency(value, currency, { signed });

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

  const span = (
    <span className={cn("tabular-nums", toneClass, className)}>{text}</span>
  );

  return quiet ? <Quietable>{span}</Quietable> : span;
}
