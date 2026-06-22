"use client";

import { useMemo, useState } from "react";
import { NetWorthTrend } from "./NetWorthTrend";
import { CashflowChart } from "./CashflowChart";
import {
  RANGES,
  fillDailyTrend,
  type CashEntry,
  type Range,
  type TrendPoint,
} from "@/lib/finance/timeframe";
import { cn } from "@/lib/utils/cn";

type Mode = "networth" | "cashflow";

const MODES: { key: Mode; label: string }[] = [
  { key: "networth", label: "Net worth" },
  { key: "cashflow", label: "Income vs expense" },
];

// The dashboard's single headline chart. One graph, switched between the
// net-worth trend and the income-against-spending view, with a shared timeframe
// so both read over the same window. Replaces the two stacked graphs.
export function MainChart({
  trend,
  income,
  expense,
  currency,
}: {
  trend: TrendPoint[];
  income: CashEntry[];
  expense: CashEntry[];
  currency: string;
}) {
  const [mode, setMode] = useState<Mode>("networth");
  const [range, setRange] = useState<Range>("6M");

  const windowed = useMemo(() => fillDailyTrend(trend, range), [trend, range]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="inline-flex overflow-hidden rounded-sm border border-border">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cn(
                "px-3 py-1.5 text-xs transition",
                mode === m.key
                  ? "bg-surface-raised text-text"
                  : "text-text-muted hover:text-text",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={cn(
                "rounded-sm border px-2 py-1 text-xs tabular-nums transition",
                range === r.key
                  ? "border-border bg-surface-raised text-text"
                  : "border-transparent text-text-muted hover:text-text",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "networth" ? (
        <NetWorthTrend points={windowed} currency={currency} />
      ) : (
        <CashflowChart
          income={income}
          expense={expense}
          currency={currency}
          range={range}
        />
      )}
    </div>
  );
}
