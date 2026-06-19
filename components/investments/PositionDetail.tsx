"use client";

import { useEffect, useState, useTransition } from "react";
import type { Investment } from "@/types";
import type { Candle, HistoryRange, HistorySession, Quote } from "@/lib/finance/market";
import { marketStatus } from "@/lib/finance/market";
import {
  setManualPrice,
  resumeLivePricing,
  reconcileInvestment,
} from "@/app/(app)/investments/actions";
import {
  positionValue,
  costBasis,
  gainLoss,
  gainLossPct,
} from "@/lib/finance/calculations";
import { convertToBase } from "@/lib/finance/currencies";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/finance/format";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Amount } from "@/components/ui/Amount";
import { CountUp } from "@/components/ui/CountUp";
import { WaxSeal } from "@/components/svg/WaxSeal";
import { useToast } from "@/components/ui/Toast";
import { PriceChart } from "./PriceChart";
import { RangeBar } from "./RangeBar";

function compact(value: number | null, currency: string): string {
  if (value == null) return "—";
  if (Math.abs(value) >= 1000) {
    return `${currency} ${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)}`;
  }
  return formatCurrency(value, currency);
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-text-faint">
        {label}
      </p>
      <p className="mt-1 text-sm tabular-nums text-text">{children}</p>
    </div>
  );
}

export function PositionDetail({
  investment,
  base,
  rateMap,
  canWrite,
  offline,
  onClose,
  onEdit,
  onRemove,
}: {
  investment: Investment | null;
  base: string;
  rateMap: Record<string, number>;
  canWrite: boolean;
  offline: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [points, setPoints] = useState<Candle[]>([]);
  const [session, setSession] = useState<HistorySession | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [range, setRange] = useState<HistoryRange>("6mo");
  const [manualInput, setManualInput] = useState("");
  const [actualInput, setActualInput] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const ticker = investment?.ticker ?? null;
  const isLive = investment?.is_live_priced ?? false;

  // Fundamentals on open.
  useEffect(() => {
    if (!ticker || !isLive) return;
    let active = true;
    const load = async () => {
      setQuoteLoading(true);
      try {
        const r = await fetch(`/api/prices/quote?symbol=${encodeURIComponent(ticker)}`);
        const d = r.ok ? await r.json() : null;
        if (active) setQuote(d?.quote ?? null);
      } catch {
        // Leave fundamentals empty; the tiles read unavailable.
      } finally {
        if (active) setQuoteLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [ticker, isLive]);

  // History on open and whenever the timeframe changes.
  useEffect(() => {
    if (!ticker || !isLive) return;
    let active = true;
    const load = async (showLoading: boolean) => {
      if (showLoading) setHistoryLoading(true);
      try {
        const r = await fetch(
          `/api/prices/history?symbol=${encodeURIComponent(ticker)}&range=${range}`,
        );
        const d = r.ok ? await r.json() : null;
        if (active) {
          setPoints(d?.points ?? []);
          setSession(d?.session ?? null);
        }
      } catch {
        // Chart shows its empty state.
      } finally {
        if (active && showLoading) setHistoryLoading(false);
      }
    };
    void load(true);
    // The one day view refreshes itself while it is open.
    let timer: ReturnType<typeof setInterval> | undefined;
    if (range === "1d") timer = setInterval(() => void load(false), 45000);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [ticker, isLive, range]);

  if (!investment) return null;

  const value = positionValue(investment.shares, investment.current_price);
  const valueBase = convertToBase(value, investment.currency, base, rateMap);
  const basis = costBasis(investment.shares, investment.purchase_price);
  const gl = gainLoss(investment.shares, investment.current_price, investment.purchase_price);
  const glPct = gainLossPct(investment.current_price, investment.purchase_price);

  const badge = investment.price_is_manual
    ? { tone: "manual" as const, label: "Manual" }
    : !investment.is_live_priced
      ? { tone: "neutral" as const, label: "Held" }
      : offline
        ? { tone: "offline" as const, label: "Offline" }
        : { tone: "live" as const, label: "Live" };

  // Market phase for a live instrument, so the chart's session reads in context
  // (a closed market is why an intraday view shows the last full day).
  const status = isLive && ticker ? marketStatus(quote?.marketState, session) : null;

  const actual = actualInput.trim() === "" ? null : Number(actualInput.replace(/[\s,]/g, ""));
  const diff = actual != null && !Number.isNaN(actual) ? actual - value : 0;

  function pinPrice() {
    if (manualInput.trim() === "") return;
    start(async () => {
      const res = await setManualPrice(investment!.id, manualInput);
      if (res.ok) {
        toast("Price pinned.", "success");
        setManualInput("");
      } else toast(res.error, "error");
    });
  }

  function resume() {
    start(async () => {
      const res = await resumeLivePricing(investment!.id);
      if (res.ok) toast("Live pricing resumed.", "success");
      else toast(res.error, "error");
    });
  }

  function bookReconcile() {
    if (actual == null || Number.isNaN(actual) || diff === 0) return;
    start(async () => {
      const res = await reconcileInvestment(investment!.id, actualInput, note);
      if (res.ok) {
        toast("Value set.", "success");
        setActualInput("");
        setNote("");
      } else toast(res.error, "error");
    });
  }

  return (
    <Modal open={investment != null} onClose={onClose} size="xl">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif text-2xl text-text">
                {investment.name ?? investment.ticker}
              </h2>
              <Badge tone={badge.tone}>{badge.label}</Badge>
              {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
            </div>
            {investment.ticker ? (
              <p className="mt-1 font-mono text-xs text-text-faint">
                {investment.ticker}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl tracking-tight text-text">
              {valueBase != null ? (
                <CountUp value={valueBase} currency={base} quiet />
              ) : (
                <Amount value={value} currency={investment.currency} quiet />
              )}
            </p>
            <div className="mt-0.5 flex items-center justify-end gap-2 text-xs">
              <Amount value={gl} currency={investment.currency} signed tone={gl >= 0 ? "pos" : "neg"} />
              {glPct != null ? (
                <span className={glPct >= 0 ? "text-pos" : "text-neg"}>
                  {formatPercent(glPct, { signed: true })}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isLive && ticker ? (
          <PriceChart
            points={points}
            currency={investment.currency}
            range={range}
            session={session}
            marketOpen={status?.open ?? false}
            loading={historyLoading}
            onRangeChange={setRange}
          />
        ) : null}

        {/* Fundamentals */}
        {isLive && ticker ? (
          <div className="flex flex-col gap-4">
            <RangeBar
              price={quote?.price ?? investment.current_price}
              low={quote?.fiftyTwoLow ?? null}
              high={quote?.fiftyTwoHigh ?? null}
              currency={investment.currency}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Day change">
                {quote?.changePct != null ? (
                  <span className={quote.changePct >= 0 ? "text-pos" : "text-neg"}>
                    {formatPercent(quote.changePct, { signed: true })}
                  </span>
                ) : (
                  "—"
                )}
              </Stat>
              <Stat label="Dividend">
                {quote?.dividendRate != null
                  ? `${formatCurrency(quote.dividendRate, investment.currency)}${quote.dividendYield != null ? ` · ${formatPercent(quote.dividendYield)}` : ""}`
                  : "None"}
              </Stat>
              <Stat label="Ex dividend">{quote?.exDividend ?? "—"}</Stat>
              <Stat label="P / E">
                {quote?.peRatio != null ? formatNumber(quote.peRatio, 1) : "—"}
              </Stat>
              <Stat label="Market cap">{compact(quote?.marketCap ?? null, investment.currency)}</Stat>
              <Stat label="Volume">
                {quote?.volume != null ? formatNumber(quote.volume, 0) : "—"}
              </Stat>
            </div>
            {quoteLoading ? (
              <p className="text-xs text-text-faint">Loading details</p>
            ) : null}
          </div>
        ) : null}

        {/* Position summary */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Units">{formatNumber(investment.shares, investment.shares % 1 === 0 ? 0 : 4)}</Stat>
          <Stat label="Cost basis">{formatCurrency(basis, investment.currency)}</Stat>
          <Stat label="Current price">
            {investment.current_price != null
              ? formatCurrency(investment.current_price, investment.currency)
              : "—"}
          </Stat>
          <Stat label="Value">{formatCurrency(value, investment.currency)}</Stat>
        </div>

        {/* Controls */}
        {canWrite ? (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                Edit position
              </Button>
              <button
                type="button"
                onClick={onRemove}
                className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:text-neg"
              >
                Remove
              </button>
            </div>
            {investment.is_live_priced ? (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id="manual-price"
                    label="Pin a price by hand"
                    inputMode="decimal"
                    placeholder={
                      investment.current_price != null
                        ? String(investment.current_price)
                        : "Price per unit"
                    }
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" onClick={pinPrice} disabled={pending}>
                  Pin
                </Button>
                {investment.price_is_manual ? (
                  <Button type="button" variant="ghost" onClick={resume} disabled={pending}>
                    Resume live
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-sm border border-border bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                Set actual value
              </p>
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id="actual-value"
                    inputMode="decimal"
                    placeholder={`Tracked ${formatCurrency(value, investment.currency)}`}
                    value={actualInput}
                    onChange={(e) => setActualInput(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={bookReconcile}
                  disabled={pending || actual == null || Number.isNaN(actual) || diff === 0}
                  className="flex items-center gap-2 rounded-sm bg-red px-3 py-2.5 text-sm text-text transition hover:bg-red-bright disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <WaxSeal size={24} />
                  Stamp
                </button>
              </div>
              {actual != null && !Number.isNaN(actual) && diff !== 0 ? (
                <p className="mt-2 text-sm text-text-muted">
                  Books a{" "}
                  <Amount
                    value={Math.abs(diff)}
                    currency={investment.currency}
                    tone={diff > 0 ? "pos" : "neg"}
                  />{" "}
                  {diff > 0 ? "gain" : "shortfall"}.
                </p>
              ) : null}
              <Input
                id="reconcile-note"
                className="mt-3"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
