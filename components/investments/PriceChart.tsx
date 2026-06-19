"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Candle, HistoryRange, HistorySession } from "@/lib/finance/market";
import { HISTORY_RANGES } from "@/lib/finance/market";
import { formatCurrency } from "@/lib/finance/format";
import { cn } from "@/lib/utils/cn";

const W = 720;
const H = 300;
const PAD = { l: 10, r: 58, t: 16, b: 24 };
const PX0 = PAD.l;
const PX1 = W - PAD.r;
const PY0 = PAD.t;
const PY1 = H - PAD.b;

const RANGE_LABELS: Record<HistoryRange, string> = {
  "1d": "1D",
  "5d": "1W",
  "1mo": "1M",
  "3mo": "3M",
  "6mo": "6M",
  "1y": "1Y",
  "5y": "5Y",
};

function niceDate(ms: number, range: HistoryRange): string {
  const d = new Date(ms);
  if (range === "1d")
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (range === "5d")
    return d.toLocaleString("en-US", { weekday: "short", hour: "numeric" });
  if (range === "5y")
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PriceChart({
  points,
  currency,
  range,
  session,
  marketOpen = false,
  loading,
  onRangeChange,
}: {
  points: Candle[];
  currency: string;
  range: HistoryRange;
  session?: HistorySession | null;
  marketOpen?: boolean;
  loading: boolean;
  onRangeChange: (range: HistoryRange) => void;
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"line" | "candle">("line");
  const [hover, setHover] = useState<{ index: number; px: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const n = points.length;

  // Geometry is pure in the data and view mode, so derive it once per series
  // rather than on every render. Hovering must not rebuild the whole path.
  const geom = useMemo(() => {
    // Domain. Line tracks close; candles need the full high/low band.
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of points) {
      const low = mode === "candle" ? p.l : p.c;
      const high = mode === "candle" ? p.h : p.c;
      if (low < lo) lo = low;
      if (high > hi) hi = high;
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 1;
    }
    const span = hi - lo || 1;
    lo -= span * 0.06;
    hi += span * 0.06;

    const xAt = (i: number) => (n <= 1 ? PX0 : PX0 + (i / (n - 1)) * (PX1 - PX0));
    const yAt = (v: number) => PY1 - ((v - lo) / (hi - lo)) * (PY1 - PY0);

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)} ${yAt(p.c).toFixed(2)}`)
      .join(" ");
    const areaPath =
      n > 0
        ? `${linePath} L${xAt(n - 1).toFixed(2)} ${PY1} L${xAt(0).toFixed(2)} ${PY1} Z`
        : "";

    const last = points[n - 1];
    const first = points[0];
    const up = last && first ? last.c >= first.c : true;
    const lineColor = up ? "var(--pos)" : "var(--neg)";

    const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f);

    // Market open and close markers, only on the one day intraday view, and
    // only when that moment actually falls inside the data we have. During an
    // open session the close has not happened yet, so its marker stays hidden.
    const nearestIndex = (ts: number) => {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(points[i].t - ts);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      return best;
    };
    const firstT = points[0]?.t ?? 0;
    const lastT = points[n - 1]?.t ?? 0;
    const within = (ts: number) => ts >= firstT && ts <= lastT;
    const markers =
      range === "1d" && session && n > 0
        ? [
            ...(within(session.open)
              ? [{ label: "Open", idx: nearestIndex(session.open) }]
              : []),
            ...(within(session.close)
              ? [{ label: "Close", idx: nearestIndex(session.close) }]
              : []),
          ]
        : [];

    // While the market is open the live series ends at "now", so the current
    // moment sits at the last point. Drawn only on the intraday view.
    const nowIdx = marketOpen && range === "1d" && n > 0 ? n - 1 : null;

    // The trading day the intraday view represents, so a last-session chart on a
    // closed market is unmistakable.
    const dayLabel =
      range === "1d" && n > 0
        ? new Date(lastT).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })
        : null;

    const candleW = n > 0 ? Math.max(1.2, ((PX1 - PX0) / n) * 0.62) : 2;

    return {
      xAt,
      yAt,
      linePath,
      areaPath,
      last,
      lineColor,
      gridY,
      markers,
      nowIdx,
      dayLabel,
      candleW,
    };
  }, [points, mode, range, session, marketOpen, n]);

  const {
    xAt,
    yAt,
    linePath,
    areaPath,
    last,
    lineColor,
    gridY,
    markers,
    nowIdx,
    dayLabel,
    candleW,
  } = geom;

  function onMove(e: React.PointerEvent) {
    if (n === 0 || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const frac = (xPx / rect.width - PX0 / W) / ((PX1 - PX0) / W);
    const index = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
    const px = (xAt(index) / W) * rect.width;
    setHover({ index, px: Math.max(48, Math.min(px, rect.width - 48)) });
  }

  // ?? null guards the brief window after a live poll grows the series.
  const hovered = hover ? points[hover.index] ?? null : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-sm border border-border">
          {(["line", "candle"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setHover(null);
              }}
              className={cn(
                "px-3 py-1 text-xs capitalize transition",
                mode === m
                  ? "bg-surface-raised text-text"
                  : "text-text-muted hover:text-text",
              )}
            >
              {m}
            </button>
          ))}
          </div>
          {dayLabel ? (
            <span className="text-xs tabular-nums text-text-faint">{dayLabel}</span>
          ) : null}
        </div>
        <div className="inline-flex gap-1">
          {HISTORY_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onRangeChange(r);
                setHover(null);
              }}
              className={cn(
                "rounded-sm px-2 py-1 text-xs transition",
                range === r
                  ? "bg-surface-raised text-text"
                  : "text-text-muted hover:text-text",
              )}
            >
              {RANGE_LABELS[r]}
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
          <defs>
            <linearGradient id="cxnet-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines + price labels */}
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

          {/* date labels */}
          {n > 1 &&
            [0, 0.33, 0.66, 1].map((f, i) => {
              const idx = Math.round(f * (n - 1));
              return (
                <text
                  key={i}
                  x={xAt(idx)}
                  y={H - 8}
                  fontSize="9"
                  fill="var(--text-faint)"
                  textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"}
                >
                  {niceDate(points[idx].t, range)}
                </text>
              );
            })}

          {loading || n === 0 ? null : mode === "line" ? (
            <>
              <motion.path
                d={areaPath}
                fill="url(#cxnet-chart-fill)"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
              <motion.path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
              />
              {last ? (
                <motion.circle
                  cx={xAt(n - 1)}
                  cy={yAt(last.c)}
                  r="3"
                  fill={lineColor}
                  initial={reduce ? false : { scale: 0, opacity: 0 }}
                  animate={
                    reduce
                      ? { opacity: 1 }
                      : { scale: [1, 1.5, 1], opacity: 1 }
                  }
                  transition={
                    reduce
                      ? {}
                      : {
                          scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                          opacity: { delay: 1.1 },
                        }
                  }
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              ) : null}
            </>
          ) : (
            points.map((p, i) => {
              const x = xAt(i);
              const green = p.c >= p.o;
              const color = green ? "var(--pos)" : "var(--neg)";
              const top = yAt(Math.max(p.o, p.c));
              const bottom = yAt(Math.min(p.o, p.c));
              return (
                <motion.g
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.32,
                    // Spread the stagger evenly across the whole series so it
                    // never catches up and lurches near the end.
                    delay: reduce ? 0 : (i / Math.max(1, n - 1)) * 0.8,
                  }}
                >
                  <line x1={x} y1={yAt(p.h)} x2={x} y2={yAt(p.l)} stroke={color} strokeWidth="0.7" />
                  <rect
                    x={x - candleW / 2}
                    y={top}
                    width={candleW}
                    height={Math.max(1, bottom - top)}
                    fill={color}
                  />
                </motion.g>
              );
            })
          )}

          {/* market open / close markers (one day view) */}
          {markers.map((m) => (
            <g key={m.label} pointerEvents="none">
              <line
                x1={xAt(m.idx)}
                y1={PY0}
                x2={xAt(m.idx)}
                y2={PY1}
                stroke="var(--brass)"
                strokeWidth="0.6"
                strokeDasharray="3 3"
                strokeOpacity="0.5"
              />
              <text
                x={xAt(m.idx)}
                y={PY0 - 5}
                fontSize="8"
                fill="var(--brass)"
                textAnchor="middle"
                className="uppercase"
              >
                {m.label}
              </text>
            </g>
          ))}

          {/* current-time marker, only while the market is open */}
          {nowIdx != null ? (
            <g pointerEvents="none">
              <line
                x1={xAt(nowIdx)}
                y1={PY0}
                x2={xAt(nowIdx)}
                y2={PY1}
                stroke="var(--pos)"
                strokeWidth="0.8"
                strokeOpacity="0.7"
              />
              <text
                x={xAt(nowIdx)}
                y={PY0 - 5}
                fontSize="8"
                fill="var(--pos)"
                textAnchor="end"
                className="uppercase"
              >
                Now
              </text>
            </g>
          ) : null}

          {/* crosshair */}
          {hovered ? (
            <g pointerEvents="none">
              <line x1={xAt(hover!.index)} y1={PY0} x2={xAt(hover!.index)} y2={PY1} stroke="var(--brass)" strokeWidth="0.6" strokeOpacity="0.5" />
              <circle cx={xAt(hover!.index)} cy={yAt(hovered.c)} r="2.5" fill="var(--brass)" />
            </g>
          ) : null}
        </svg>

        {/* tooltip */}
        {hovered ? (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[11px] shadow-lg"
            style={{ left: hover!.px }}
          >
            <p className="text-text-faint">{niceDate(hovered.t, range)}</p>
            <p className="tabular-nums text-text">{formatCurrency(hovered.c, currency)}</p>
            {mode === "candle" ? (
              <p className="tabular-nums text-text-muted">
                {formatCurrency(hovered.l, currency)} to {formatCurrency(hovered.h, currency)}
              </p>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs uppercase tracking-[0.18em] text-text-faint">
              Loading prices
            </p>
          </div>
        ) : n === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs uppercase tracking-[0.18em] text-text-faint">
              No price history
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
