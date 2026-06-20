"use client";

import { useMemo, useState } from "react";
import { Amount } from "@/components/ui/Amount";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/finance/format";
import { dayStart, weekStart, monthStart, type CashEntry } from "@/lib/finance/timeframe";
import { cn } from "@/lib/utils/cn";

type Gran = "day" | "week" | "month";

const PERIODS: { key: Gran; toggle: string; now: string; prev: string }[] = [
  { key: "day", toggle: "Day", now: "Today", prev: "yesterday" },
  { key: "week", toggle: "Week", now: "This week", prev: "last week" },
  { key: "month", toggle: "Month", now: "This month", prev: "last month" },
];

// Start of the current period and of the one before it, in local time.
function bounds(gran: Gran): { cur: number; prev: number } {
  const now = new Date();
  if (gran === "day") {
    const cur = dayStart(now);
    const prev = new Date(cur);
    prev.setDate(prev.getDate() - 1);
    return { cur: cur.getTime(), prev: prev.getTime() };
  }
  if (gran === "week") {
    const cur = weekStart(now);
    const prev = new Date(cur);
    prev.setDate(prev.getDate() - 7);
    return { cur: cur.getTime(), prev: prev.getTime() };
  }
  const cur = monthStart(now);
  const prev = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
  return { cur: cur.getTime(), prev: prev.getTime() };
}

// The change in actual cashflow this period against the one before, by value and
// percent. `entries` are already in base currency. `higherIsBetter` colors the
// move: more income reads positive, more spending reads negative.
export function ChangeView({
  entries,
  currency,
  higherIsBetter,
}: {
  entries: CashEntry[];
  currency: string;
  higherIsBetter: boolean;
}) {
  const [gran, setGran] = useState<Gran>("month");
  const meta = PERIODS.find((p) => p.key === gran)!;

  const { current, delta, pct } = useMemo(() => {
    const { cur, prev } = bounds(gran);
    let current = 0;
    let previous = 0;
    for (const e of entries) {
      if (e.t >= cur) current += e.v;
      else if (e.t >= prev) previous += e.v;
    }
    const delta = current - previous;
    const pct = previous > 0 ? (delta / previous) * 100 : null;
    return { current, delta, pct };
  }, [entries, gran]);

  const tone =
    delta === 0 ? "muted" : delta > 0 === higherIsBetter ? "pos" : "neg";
  const pctClass =
    tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-text-faint";

  return (
    <Card className="mt-6 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.18em] text-text-faint">
          {meta.now}
        </p>
        <div className="inline-flex overflow-hidden rounded-sm border border-border">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setGran(p.key)}
              className={cn(
                "px-2.5 py-1 text-xs transition",
                gran === p.key
                  ? "bg-surface-raised text-text"
                  : "text-text-muted hover:text-text",
              )}
            >
              {p.toggle}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <Amount value={current} currency={currency} quiet className="font-serif text-2xl" />
        <div className="flex items-center gap-2 text-sm">
          <Amount value={delta} currency={currency} signed tone={tone} quiet />
          <span className={cn("tabular-nums", pctClass)}>
            {pct == null ? "new" : `(${formatPercent(pct, { signed: true })})`}
          </span>
          <span className="text-xs text-text-faint">vs {meta.prev}</span>
        </div>
      </div>
    </Card>
  );
}
