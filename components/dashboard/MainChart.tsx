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
import { SegmentedControl } from "@/components/ui/SegmentedControl";

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
        <SegmentedControl
          ariaLabel="Chart metric"
          value={mode}
          onChange={setMode}
          options={MODES}
        />
        <SegmentedControl
          ariaLabel="Timeframe"
          variant="pills"
          size="sm"
          value={range}
          onChange={setRange}
          options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
        />
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
