"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatCurrency } from "@/lib/finance/format";
import { useQuietMode } from "@/components/layout/QuietMode";
import { cn } from "@/lib/utils/cn";
import type { TrendPoint } from "@/lib/finance/timeframe";

export type { TrendPoint };

const W = 720;
const H = 220;
const PAD = { l: 8, r: 64, t: 16, b: 22 };
const PX0 = PAD.l;
const PX1 = W - PAD.r;
const PY0 = PAD.t;
const PY1 = H - PAD.b;

function niceDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function NetWorthTrend({
  points,
  currency,
}: {
  points: TrendPoint[];
  currency: string;
}) {
  const reduce = useReducedMotion();
  const { quiet } = useQuietMode();
  const [hover, setHover] = useState<{ index: number; px: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const n = points.length;

  const geom = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of points) {
      if (p.v < lo) lo = p.v;
      if (p.v > hi) hi = p.v;
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 1;
    }
    const span = hi - lo || Math.abs(hi) || 1;
    lo -= span * 0.12;
    hi += span * 0.12;

    const xAt = (i: number) => (n <= 1 ? (PX0 + PX1) / 2 : PX0 + (i / (n - 1)) * (PX1 - PX0));
    const yAt = (v: number) => PY1 - ((v - lo) / (hi - lo)) * (PY1 - PY0);

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)} ${yAt(p.v).toFixed(2)}`)
      .join(" ");
    const areaPath =
      n > 0
        ? `${linePath} L${xAt(n - 1).toFixed(2)} ${PY1} L${xAt(0).toFixed(2)} ${PY1} Z`
        : "";

    const last = points[n - 1];
    const first = points[0];
    const up = last && first ? last.v >= first.v : true;
    const color = up ? "var(--pos)" : "var(--neg)";
    const gridY = [0, 0.5, 1].map((f) => lo + (hi - lo) * f);

    return { xAt, yAt, linePath, areaPath, last, color, gridY };
  }, [points, n]);

  const { xAt, yAt, linePath, areaPath, last, color, gridY } = geom;

  function onMove(e: React.PointerEvent) {
    if (n === 0 || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const frac = (xPx / rect.width - PX0 / W) / ((PX1 - PX0) / W);
    const index = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
    const px = (xAt(index) / W) * rect.width;
    setHover({ index, px: Math.max(52, Math.min(px, rect.width - 52)) });
  }

  const hovered = hover ? points[hover.index] ?? null : null;

  // A single point is not yet a trend; invite more history honestly.
  if (n < 2) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-text-faint">
          Building your history
        </p>
        <p className="max-w-xs text-xs text-text-muted">
          A point is captured each day you visit. The line takes shape as the days
          add up.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        <defs>
          <linearGradient id="cxnet-nw-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridY.map((v, i) => {
          const y = yAt(v);
          return (
            <g key={i}>
              <line x1={PX0} y1={y} x2={PX1} y2={y} stroke="var(--border)" strokeWidth="0.5" />
              <text x={PX1 + 6} y={y + 3} fontSize="9" fill="var(--text-faint)" className={cn("tabular-nums", quiet && "blur-[4px]")}>
                {formatCurrency(v, currency)}
              </text>
            </g>
          );
        })}

        <motion.path
          d={areaPath}
          fill="url(#cxnet-nw-fill)"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
        {last ? (
          <circle cx={xAt(n - 1)} cy={yAt(last.v)} r="3" fill={color} />
        ) : null}

        {hovered ? (
          <g pointerEvents="none">
            <line x1={xAt(hover!.index)} y1={PY0} x2={xAt(hover!.index)} y2={PY1} stroke="var(--brass)" strokeWidth="0.6" strokeOpacity="0.5" />
            <circle cx={xAt(hover!.index)} cy={yAt(hovered.v)} r="2.5" fill="var(--brass)" />
          </g>
        ) : null}
      </svg>

      {hovered ? (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: hover!.px }}
        >
          <p className="text-text-faint">{niceDate(hovered.t)}</p>
          <p className={cn("tabular-nums text-text", quiet && "select-none blur-sm")}>
            {formatCurrency(hovered.v, currency)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
