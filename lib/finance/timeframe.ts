// Timeframe windowing and bucketing for the time-series screens. Pure and
// client-safe: no IO, all reasoning in the viewer's local time so a week starts
// on their Monday and a day rolls over at their midnight. Shared by the
// dashboard's main graph and the income / expense change views, so the two never
// disagree on where a period begins.

export type TrendPoint = { t: number; v: number };
export type CashEntry = { t: number; v: number };

export type Range = "1W" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "YTD" | "ALL";

export const RANGES: { key: Range; label: string }[] = [
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
  { key: "2Y", label: "2Y" },
  { key: "YTD", label: "YTD" },
  { key: "ALL", label: "All" },
];

export type Granularity = "day" | "week" | "month";

// ---------------------------------------------------------------------------
// Local-time period starts. Each returns midnight at the start of the period
// containing `d`, in the local zone.
// ---------------------------------------------------------------------------
export function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Monday-midnight that begins the week containing `d`.
export function weekStart(d: Date): Date {
  const x = dayStart(d);
  const dow = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - dow);
  return x;
}

export function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// The inclusive lower bound (ms) of the window for a range. `earliest` is the
// oldest data point, used as the floor for "All". Windows are rolling: 3M means
// the last three months up to now, YTD means since January 1.
export function rangeStart(range: Range, earliest: number): number {
  const now = new Date();
  const back = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - months);
    return dayStart(d).getTime();
  };
  switch (range) {
    case "1W": {
      const d = dayStart(now);
      d.setDate(d.getDate() - 6);
      return d.getTime();
    }
    case "1M":
      return back(1);
    case "3M":
      return back(3);
    case "6M":
      return back(6);
    case "1Y":
      return back(12);
    case "2Y":
      return back(24);
    case "YTD":
      return new Date(now.getFullYear(), 0, 1).getTime();
    case "ALL":
      return earliest;
  }
}

// How finely a range is bucketed for the cashflow view: short windows read day
// by day, mid windows by week, long windows by month.
export function granularityFor(range: Range): Granularity {
  switch (range) {
    case "1W":
    case "1M":
      return "day";
    case "3M":
    case "6M":
      return "week";
    default:
      return "month";
  }
}

function bucketStartFor(t: number, gran: Granularity): number {
  const d = new Date(t);
  if (gran === "day") return dayStart(d).getTime();
  if (gran === "week") return weekStart(d).getTime();
  return monthStart(d).getTime();
}

function nextBucket(start: number, gran: Granularity): number {
  const d = new Date(start);
  if (gran === "day") d.setDate(d.getDate() + 1);
  else if (gran === "week") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

function bucketLabel(start: number, gran: Granularity): string {
  const d = new Date(start);
  if (gran === "month") return d.toLocaleDateString("en-US", { month: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type Bucket = {
  start: number;
  label: string;
  income: number;
  expense: number;
};

// Net-worth trend filtered to a range. The oldest point in the window is kept so
// the line still reaches the left edge; "All" returns everything.
export function windowPoints(points: TrendPoint[], range: Range): TrendPoint[] {
  if (range === "ALL" || points.length === 0) return points;
  const cutoff = rangeStart(range, points[0].t);
  const windowed = points.filter((p) => p.t >= cutoff);
  // If the window cut every point but one boundary, fall back to the last two so
  // the chart still draws a segment rather than the empty state.
  return windowed.length >= 2 ? windowed : points.slice(-2);
}

// Bucket actual income and expense entries into the empty grid of the window, in
// local time, so periods with no activity still read as zero rather than
// collapsing the axis.
export function buildCashflowBuckets(
  income: CashEntry[],
  expense: CashEntry[],
  range: Range,
): { buckets: Bucket[]; maxV: number; granularity: Granularity } {
  const all = income.length || expense.length ? [...income, ...expense] : [];
  const earliest = all.length
    ? all.reduce((m, e) => Math.min(m, e.t), Infinity)
    : Date.now();
  const gran = granularityFor(range);
  const cutoff = rangeStart(range, earliest);
  const now = Date.now();

  const buckets: Bucket[] = [];
  let s = bucketStartFor(cutoff, gran);
  // Guard against a pathological range producing an unbounded grid.
  for (let guard = 0; s <= now && guard < 1024; guard++) {
    buckets.push({ start: s, label: bucketLabel(s, gran), income: 0, expense: 0 });
    s = nextBucket(s, gran);
  }

  const index = new Map(buckets.map((b, i) => [b.start, i]));
  const add = (entries: CashEntry[], key: "income" | "expense") => {
    for (const e of entries) {
      if (e.t < cutoff) continue;
      const i = index.get(bucketStartFor(e.t, gran));
      if (i != null) buckets[i][key] += e.v;
    }
  };
  add(income, "income");
  add(expense, "expense");

  let maxV = 0;
  for (const b of buckets) maxV = Math.max(maxV, b.income, b.expense);
  return { buckets, maxV, granularity: gran };
}
