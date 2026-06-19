"use client";

import { useEffect, useState } from "react";
import type { Candle, HistoryRange, HistorySession } from "@/lib/finance/market";
import { PriceChart } from "./PriceChart";

// A chart that fetches its own history for a symbol, so it can be dropped into
// the add position flow as a live preview. Mirrors the detail view's loader on a
// smaller surface.
export function SymbolChart({
  symbol,
  currency,
}: {
  symbol: string;
  currency: string;
}) {
  const [points, setPoints] = useState<Candle[]>([]);
  const [session, setSession] = useState<HistorySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<HistoryRange>("6mo");

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/prices/history?symbol=${encodeURIComponent(symbol)}&range=${range}`,
        );
        const d = r.ok ? await r.json() : null;
        if (active) {
          setPoints(d?.points ?? []);
          setSession(d?.session ?? null);
        }
      } catch {
        // Empty state handles the failure.
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [symbol, range]);

  return (
    <PriceChart
      points={points}
      currency={currency}
      range={range}
      session={session}
      loading={loading}
      onRangeChange={setRange}
    />
  );
}
