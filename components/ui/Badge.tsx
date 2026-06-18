import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// Small status label. Tones cover the recurring cases: price source on a
// position (live, offline, manual), and gain or loss.
type Tone = "neutral" | "live" | "offline" | "manual" | "pos" | "neg";

const TONES: Record<Tone, string> = {
  neutral: "text-text-muted border-border",
  live: "text-pos border-pos/40",
  offline: "text-text-faint border-border",
  manual: "text-brass border-brass/40",
  pos: "text-pos border-pos/40",
  neg: "text-neg border-neg/40",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
