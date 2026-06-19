"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatCurrency } from "@/lib/finance/format";
import { Amount } from "@/components/ui/Amount";
import { cn } from "@/lib/utils/cn";

export type CashEntry = { t: number; v: number };

const W = 720;
const H = 230;
const PAD = { l: 8, r: 64, t: 16, b: 26 };
const PX0 = PAD.l;
const PX1 = W - PAD.r;
const PY0 = PAD.t;
const PY1 = H - PAD.b;

const MONTHS = 6;
const WEEKS = 13;

type Mode = "weekly" | "monthly";
type Bucket = { start: number; label: string; income: number; expense: number };

// Local Monday-midnight that begins the week containing `d`.
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - dow);
  return x;
}

// Build the recent window of empty buckets, in local time, so months and weeks
// with no activity still read as zero rather than vanishing.
function buildBuckets(mode: Mode): Bucket[] {
  const now = new Date();
  const out: Bucket[] = [];
  if (mode === "monthly") {
    for (let i = MONTHS - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        start: d.getTime(),
        label: d.toLocaleDateString("en-US", { month: "short" }),
        income: 0,
        expense: 0,
      });
    }
  } else {
    const thisMon = weekStart(now);
    for (let i = WEEKS - 1; i >= 0; i--) {
      const d = new Date(thisMon);
      d.setDate(d.getDate() - i * 7);
      out.push({
        start: d.getTime(),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        income: 0,
        expense: 0,
      });
    }
  }
  return out;
}

function bucketStartFor(t: number, mode: Mode): number {
  const d = new Date(t);
  if (mode === "monthly") return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return weekStart(d).getTime();
}

export function CashflowChart({
  income,
  expense,
  currency,
}: {
  income: CashEntry[];
  expense: CashEntry[];
  currency: string;
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("monthly");
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { buckets, geom, maxV } = useMemo(() => {
    const buckets = buildBuckets(mode);
    const index = new Map(buckets.map((b, i) => [b.start, i]));
    const add = (entries: CashEntry[], key: "income" | "expense") => {
      for (const e of entries) {
        const i = index.get(bucketStartFor(e.t, mode));
        if (i != null) buckets[i][key] += e.v;
      }
    };
    add(income, "income");
    add(expense, "expense");

    let maxV = 0;
    for (const b of buckets) maxV = Math.max(maxV, b.income, b.expense);
    const hi = maxV || 1;
    const n = buckets.length;

    const xAt = (i: number) => (n <= 1 ? (PX0 + PX1) / 2 : PX0 + (i / (n - 1)) * (PX1 - PX0));
    const yAt = (v: number) => PY1 - (v / hi) * (PY1 - PY0);
    const path = (key: "income" | "expense") =>
      buckets
        .map((b, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)} ${yAt(b[key]).toFixed(2)}`)
        .join(" ");

    const gridY = [0, 0.5, 1].map((f) => hi * f);
    return {
      buckets,
      maxV,
      geom: { n, xAt, yAt, incomePath: path("income"), expensePath: path("expense"), gridY },
    };
  }, [income, expense, mode]);

  const { n, xAt, yAt, incomePath, expensePath, gridY } = geom;

  function onMove(e: React.PointerEvent) {
    if (n === 0 || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const fx = (frac - PX0 / W) / ((PX1 - PX0) / W);
    setHover(Math.max(0, Math.min(n - 1, Math.round(fx * (n - 1)))));
  }

  const b = hover != null ? buckets[hover] ?? null : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="h-1.5 w-3 rounded-full bg-pos" /> Income
          </span>
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="h-1.5 w-3 rounded-full bg-red-bright" /> Expenses
          </span>
        </div>
        <div className="inline-flex overflow-hidden rounded-sm border border-border">
          {(["weekly", "monthly"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setHover(null);
              }}
              className={cn(
                "px-3 py-1 text-xs capitalize transition",
                mode === m ? "bg-surface-raised text-text" : "text-text-muted hover:text-text",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
          {gridY.map((v, i) => {
            const y = yAt(v);
            return (
              <g key={i}>
                <line x1={PX0} y1={y} x2={PX1} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                <text x={PX1 + 6} y={y + 3} fontSize="9" fill="var(--text-faint)" className="tabular-nums">
                  {formatCurrency(v, currency)}
                </text>
              </g>
            );
          })}

          {/* x labels: ends plus a midpoint, to avoid crowding the weekly view */}
          {buckets.map((bk, i) =>
            i === 0 || i === n - 1 || i === Math.floor((n - 1) / 2) ? (
              <text
                key={i}
                x={xAt(i)}
                y={H - 8}
                fontSize="9"
                fill="var(--text-faint)"
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              >
                {bk.label}
              </text>
            ) : null,
          )}

          <motion.path
            d={expensePath}
            fill="none"
            stroke="var(--red-bright)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
          <motion.path
            d={incomePath}
            fill="none"
            stroke="var(--pos)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut", delay: 0.1 }}
          />

          {b != null && hover != null ? (
            <g pointerEvents="none">
              <line x1={xAt(hover)} y1={PY0} x2={xAt(hover)} y2={PY1} stroke="var(--brass)" strokeWidth="0.6" strokeOpacity="0.5" />
              <circle cx={xAt(hover)} cy={yAt(b.income)} r="2.5" fill="var(--pos)" />
              <circle cx={xAt(hover)} cy={yAt(b.expense)} r="2.5" fill="var(--red-bright)" />
            </g>
          ) : null}
        </svg>

        {b != null ? (
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-sm border border-border bg-surface px-3 py-2 text-[11px] shadow-lg">
            <p className="text-text-faint">{b.label}</p>
            <p className="flex items-center justify-between gap-4 tabular-nums">
              <span className="text-text-muted">Income</span>
              <Amount value={b.income} currency={currency} tone="pos" quiet />
            </p>
            <p className="flex items-center justify-between gap-4 tabular-nums">
              <span className="text-text-muted">Expenses</span>
              <Amount value={b.expense} currency={currency} tone="neg" quiet />
            </p>
            <p className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1 tabular-nums">
              <span className="text-text-faint">Net</span>
              <Amount
                value={b.income - b.expense}
                currency={currency}
                signed
                tone={b.income - b.expense >= 0 ? "pos" : "neg"}
                quiet
              />
            </p>
          </div>
        ) : null}

        {maxV === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs uppercase tracking-[0.18em] text-text-faint">
              No income or expenses in this window
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
