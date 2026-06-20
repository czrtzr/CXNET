"use client";

import { useState } from "react";
import type { AccountRef, Investment, InvestmentType } from "@/types";
import {
  ACCOUNT_TYPE_LABELS,
  INVESTMENT_TYPES,
  LIVE_INVESTMENT_TYPES,
} from "@/types";
import { CURRENCY_OPTIONS } from "@/lib/finance/currencies";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { StockSearch } from "./StockSearch";
import { SymbolChart } from "./SymbolChart";
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
  accounts,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Investment;
  base: string;
  accounts: AccountRef[];
  pending: boolean;
  onSubmit: (input: InvestmentInput) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<InvestmentType>(initial?.type ?? "stock");
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [shares, setShares] = useState(initial ? String(initial.shares) : "");
  const [purchasePrice, setPurchasePrice] = useState(
    initial?.purchase_price != null ? String(initial.purchase_price) : "",
  );
  const [currentValue, setCurrentValue] = useState(
    initial?.current_price != null ? String(initial.current_price) : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? base);
  const [accountId, setAccountId] = useState(initial?.account_id ?? "");
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchase_date ?? today());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [previewSymbol, setPreviewSymbol] = useState(initial?.ticker ?? "");
  const [touched, setTouched] = useState(false);

  const isLive = LIVE_INVESTMENT_TYPES.includes(type);

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
      account_id: accountId === "" ? null : accountId,
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
        <>
          <StockSearch
            value={ticker}
            onChange={setTicker}
            onSelect={(picked) => {
              setTicker(picked.symbol);
              if (picked.name) setName(picked.name);
              if (picked.currency) setCurrency(picked.currency);
              if (picked.price != null) setCurrentValue(String(picked.price));
              setPreviewSymbol(picked.symbol);
            }}
          />
          {touched && ticker.trim() === "" ? (
            <p className="text-xs text-neg">Search and pick a symbol.</p>
          ) : null}
          {previewSymbol ? (
            <div className="rounded-sm border border-border bg-surface p-3">
              <SymbolChart symbol={previewSymbol} currency={currency} />
            </div>
          ) : null}
        </>
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
        <SelectMenu
          id="currency"
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={CURRENCY_OPTIONS}
        />
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

      {accounts.length > 0 ? (
        <SelectMenu
          id="account"
          label="Held in account"
          value={accountId}
          onChange={setAccountId}
          options={[
            { value: "", label: "Not linked", hint: "Counts on its own" },
            ...accounts.map((a) => ({
              value: a.id,
              label: a.account_name,
              hint: ACCOUNT_TYPE_LABELS[a.account_type],
            })),
          ]}
        />
      ) : null}

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
