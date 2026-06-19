"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatCurrency, formatPercent } from "@/lib/finance/format";

export type Segment = {
  key: string;
  label: string;
  value: number;
  // An explicit color wins (category swatches); otherwise the key maps into the
  // house palette below.
  color?: string;
};

// Warm, restrained palette drawn from the design tokens. Steady holdings read
// green, equities brass, the rest in leather and oxblood. No rainbow.
const COLORS: Record<string, string> = {
  cash: "var(--pos)",
  Equities: "var(--brass)",
  Crypto: "var(--red-bright)",
  Bonds: "var(--leather-light)",
  "Real estate": "var(--leather)",
  Other: "var(--text-muted)",
};
const FALLBACK = ["var(--brass)", "var(--leather-light)", "var(--leather)", "var(--red)"];

const R = 56;
const STROKE = 22;
const SIZE = 150;
const C = 2 * Math.PI * R;

export function AllocationDonut({
  segments,
  currency,
}: {
  segments: Segment[];
  currency: string;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);

  const { arcs, total } = useMemo(() => {
    const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
    const arcs = segments.map((seg, i) => {
      const fraction = seg.value / total;
      // Start where every earlier segment leaves off, computed from the prefix
      // rather than a running mutation so render stays side-effect free.
      const priorFraction =
        segments.slice(0, i).reduce((sum, s) => sum + s.value, 0) / total;
      return {
        ...seg,
        fraction,
        color: seg.color ?? COLORS[seg.key] ?? FALLBACK[i % FALLBACK.length],
        dash: fraction * C,
        rotation: priorFraction * 360,
      };
    });
    return { arcs, total };
  }, [segments]);

  const focus = active != null ? arcs[active] : null;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--surface-hover)"
            strokeWidth={STROKE}
          />
          {arcs.map((arc, i) => (
            <motion.circle
              key={arc.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={active === i ? STROKE + 4 : STROKE}
              strokeDasharray={`${arc.dash} ${C}`}
              transform={`rotate(${arc.rotation} ${SIZE / 2} ${SIZE / 2})`}
              initial={reduce ? false : { strokeDashoffset: arc.dash }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
            />
          ))}
        </svg>
        {/* Center readout: hovered slice, or the whole portfolio. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-faint">
            {focus ? focus.label : "Total"}
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-text">
            {focus
              ? formatPercent((focus.value / total) * 100, { decimals: 0 })
              : formatCurrency(total, currency)}
          </p>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {arcs.map((arc, i) => (
          <li
            key={arc.key}
            className="flex items-center gap-2 text-xs"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: arc.color }}
            />
            <span className="truncate text-text-muted">{arc.label}</span>
            <span className="ml-auto shrink-0 tabular-nums text-text-faint">
              {formatPercent(arc.fraction * 100, { decimals: 0 })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
