"use client";

import { useEffect, useState } from "react";
import type { MiniQuote, SearchHit } from "@/lib/finance/market";
import { formatPercent } from "@/lib/finance/format";
import { cn } from "@/lib/utils/cn";

export type Picked = {
  symbol: string;
  name: string;
  currency: string | null;
  price: number | null;
};

// Typeahead over Yahoo symbol search. Shows the top matches with each one's
// daily move, fetched in a single batch call. Selecting a row hands the symbol,
// name, currency, and price back to the form.
export function StockSearch({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (picked: Picked) => void;
}) {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [changes, setChanges] = useState<Record<string, MiniQuote>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const q = value.trim();
    const timer = setTimeout(async () => {
      if (q.length < 1) {
        if (active) {
          setHits([]);
          setChanges({});
        }
        return;
      }
      try {
        if (active) setBusy(true);
        const r = await fetch(`/api/prices/search?q=${encodeURIComponent(q)}`);
        const d = r.ok ? await r.json() : null;
        const list: SearchHit[] = (d?.hits ?? []).slice(0, 6);
        if (!active) return;
        setHits(list);

        const symbols = list.map((h) => h.symbol).join(",");
        if (symbols) {
          const cr = await fetch(`/api/prices/quotes?symbols=${encodeURIComponent(symbols)}`);
          const cd = cr.ok ? await cr.json() : null;
          if (active) setChanges(cd?.quotes ?? {});
        }
      } catch {
        // Leave the last results in place.
      } finally {
        if (active) setBusy(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value]);

  function pick(hit: SearchHit) {
    const mini = changes[hit.symbol];
    onSelect({
      symbol: hit.symbol,
      name: hit.name || hit.symbol,
      currency: mini?.currency ?? null,
      price: mini?.price ?? null,
    });
    setOpen(false);
  }

  return (
    <div className="relative">
      <label
        htmlFor="symbol-search"
        className="text-xs uppercase tracking-[0.18em] text-text-muted"
      >
        Search
      </label>
      <input
        id="symbol-search"
        autoComplete="off"
        placeholder="Company or ticker"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="mt-2 w-full rounded-sm border border-border bg-surface px-3.5 py-2.5 text-text outline-none transition placeholder:text-text-faint focus:border-red-bright"
      />

      {open && hits.length > 0 ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-sm border border-border-strong bg-surface-raised shadow-xl">
          {hits.map((hit) => {
            const change = changes[hit.symbol]?.changePct ?? null;
            return (
              <button
                key={`${hit.symbol}-${hit.exchange}`}
                type="button"
                onClick={() => pick(hit)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition hover:bg-surface-hover"
              >
                <span className="min-w-0">
                  <span className="font-mono text-sm text-text">{hit.symbol}</span>
                  <span className="ml-2 truncate text-xs text-text-muted">
                    {hit.name}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="text-text-faint">{hit.exchange}</span>
                  {change != null ? (
                    <span className={cn("tabular-nums", change >= 0 ? "text-pos" : "text-neg")}>
                      {formatPercent(change, { signed: true })}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
          {busy ? (
            <p className="px-3.5 py-2 text-xs text-text-faint">Searching</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
