"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";

// One toggle, used everywhere a small set of options switches a view: the active
// background is a single element that slides from option to option via a shared
// layoutId, so changing selection reads as one connected motion instead of two
// independent fades. Two looks: `enclosed` (a bordered segmented bar) and `pills`
// (a loose row). Reduced motion drops the slide to an instant swap.
type Option<T extends string> = { key: T; label: string };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = "enclosed",
  size = "md",
  ariaLabel,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (key: T) => void;
  variant?: "enclosed" | "pills";
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const layoutId = useId();
  const reduce = useReducedMotion();
  const pad = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex",
        variant === "enclosed"
          ? "overflow-hidden rounded-sm border border-border"
          : "flex-wrap gap-1",
      )}
    >
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={cn(
              "relative text-xs tabular-nums transition-colors",
              pad,
              variant === "pills" && "rounded-sm border border-transparent",
              active ? "text-text" : "text-text-muted hover:text-text",
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className={cn(
                  "absolute inset-0 -z-0 bg-surface-raised",
                  variant === "enclosed"
                    ? "border-x border-border first:border-l-0"
                    : "rounded-sm border border-border-strong",
                )}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 380, damping: 32 }
                }
              />
            ) : null}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
