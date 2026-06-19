"use client";

import { useState, useTransition } from "react";
import type { Investment, InvestmentType } from "@/types";
import { INVESTMENT_TYPES, LIVE_INVESTMENT_TYPES } from "@/types";
import { CURRENCIES } from "@/lib/finance/currencies";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { InvestmentInput } from "@/app/(app)/investments/actions";

const TYPE_LABELS: Record<InvestmentType, string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Crypto",
  bond: "Bond",
  real_estate: "Real estate",
  other: "Other",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InvestmentForm({
  initial,
  base,
  pending,
  onSubmit,
  onCancel,
  onError,
}: {
  initial?: Investment;
  base: string;
  pending: boolean;
  onSubmit: (input: InvestmentInput) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [type, setType] = useState<InvestmentType>(initial?.type ?? "stock");
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [shares, setShares] = useState(
    initial ? String(initial.shares) : "",
  );
  const [purchasePrice, setPurchasePrice] = useState(
    initial?.purchase_price != null ? String(initial.purchase_price) : "",
  );
  const [currentValue, setCurrentValue] = useState(
    initial?.current_price != null ? String(initial.current_price) : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? base);
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchase_date ?? today());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [touched, setTouched] = useState(false);
  const [lookingUp, startLookup] = useTransition();

  const isLive = LIVE_INVESTMENT_TYPES.includes(type);

  function lookUp() {
    const sym = ticker.trim();
    if (sym === "") return;
    startLookup(async () => {
      try {
        const res = await fetch(`/api/prices/quote?symbol=${encodeURIComponent(sym)}`);
        if (!res.ok) {
          onError("Could not find that symbol.");
          return;
        }
        const { quote } = await res.json();
        if (quote?.name) setName(quote.name);
        if (quote?.currency) setCurrency(quote.currency);
        if (quote?.price != null) setCurrentValue(String(quote.price));
      } catch {
        onError("Look up failed. Try again.");
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const sharesOk = shares.trim() !== "" && !Number.isNaN(Number(shares));
    if (!sharesOk) return;
    if (isLive && ticker.trim() === "") return;
    if (!isLive && name.trim() === "") return;

    onSubmit({
      ticker: isLive ? ticker : null,
      name,
      shares,
      purchase_price: purchasePrice === "" ? null : purchasePrice,
      current_price: currentValue === "" ? null : currentValue,
      currency,
      type,
      purchase_date: purchaseDate,
      notes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select
        id="type"
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value as InvestmentType)}
      >
        {INVESTMENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABELS[t]}
          </option>
        ))}
      </Select>

      {isLive ? (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              id="ticker"
              label="Ticker"
              placeholder={type === "crypto" ? "BTC-USD" : "AAPL"}
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              error={touched && ticker.trim() === "" ? "Enter a ticker." : undefined}
            />
          </div>
          <Button type="button" variant="outline" onClick={lookUp} disabled={lookingUp}>
            {lookingUp ? "Looking" : "Look up"}
          </Button>
        </div>
      ) : null}

      <Input
        id="name"
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={touched && !isLive && name.trim() === "" ? "Name the holding." : undefined}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="shares"
          label={isLive ? "Units" : "Quantity"}
          inputMode="decimal"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          error={
            touched && (shares.trim() === "" || Number.isNaN(Number(shares)))
              ? "Enter units."
              : undefined
          }
        />
        <Select
          id="currency"
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="purchase"
          label="Purchase price"
          inputMode="decimal"
          placeholder="Per unit"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
        />
        <Input
          id="current"
          label={isLive ? "Current price" : "Current value"}
          inputMode="decimal"
          placeholder={isLive ? "Auto on refresh" : "Per unit"}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
        />
      </div>

      <Input
        id="purchase-date"
        label="Purchase date"
        type="date"
        value={purchaseDate}
        onChange={(e) => setPurchaseDate(e.target.value)}
      />

      <Textarea
        id="notes"
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {initial ? "Save changes" : "Add position"}
        </Button>
      </div>
    </form>
  );
}
