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
  quiet = true,
  code = false,
  className,
}: {
  value: number;
  currency: string;
  signed?: boolean;
  tone?: Tone;
  // Participate in quiet mode by default, so every figure blurs together. Pass
  // quiet={false} only for figures that must always read (none today).
  quiet?: boolean;
  // Append the ISO currency code as a faint suffix, e.g. "$1 200.00 CAD", to
  // disambiguate accounts in different currencies that share a symbol.
  code?: boolean;
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
    <span className={cn("tabular-nums", toneClass, className)}>
      {text}
      {code ? (
        <span className="ml-1 align-baseline text-[0.7em] font-normal tracking-wide text-text-faint">
          {currency}
        </span>
      ) : null}
    </span>
  );

  return quiet ? <Quietable>{span}</Quietable> : span;
}
