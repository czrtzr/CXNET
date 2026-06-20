"use client";

import { useState } from "react";
import type {
  AssetRef,
  DebtDirection,
  Liability,
  LiabilityType,
} from "@/types";
import {
  LIABILITY_TYPES,
  LIABILITY_TYPE_LABELS,
} from "@/types";
import { CURRENCIES } from "@/lib/finance/currencies";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { LiabilityInput } from "@/app/(app)/net-worth/actions";

function numeric(value: string): number {
  return Number(value.replace(/[\s,]/g, ""));
}

export function LiabilityForm({
  initial,
  base,
  assets,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Liability;
  base: string;
  assets: AssetRef[];
  pending: boolean;
  onSubmit: (input: LiabilityInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<LiabilityType>(
    initial?.liability_type ?? "mortgage",
  );
  const [direction, setDirection] = useState<DebtDirection>(
    initial?.direction ?? "owed_by_me",
  );
  const [balance, setBalance] = useState(initial ? String(initial.balance) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? base);
  const [principal, setPrincipal] = useState(
    initial?.original_principal != null ? String(initial.original_principal) : "",
  );
  const [rate, setRate] = useState(
    initial?.interest_rate != null ? String(initial.interest_rate) : "",
  );
  const [term, setTerm] = useState(
    initial?.term_months != null ? String(initial.term_months) : "",
  );
  const [payment, setPayment] = useState(
    initial?.payment_amount != null ? String(initial.payment_amount) : "",
  );
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [assetId, setAssetId] = useState(initial?.asset_id ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [touched, setTouched] = useState(false);

  const nameValid = name.trim() !== "";
  const balanceValid = balance.trim() !== "" && !Number.isNaN(numeric(balance));
  const owedByMe = direction === "owed_by_me";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nameValid || !balanceValid) return;
    onSubmit({
      name,
      liability_type: type,
      direction,
      balance,
      currency,
      original_principal: principal === "" ? null : principal,
      interest_rate: rate === "" ? null : rate,
      term_months: term === "" ? null : term,
      payment_amount: payment === "" ? null : payment,
      start_date: startDate === "" ? null : startDate,
      asset_id: assetId === "" ? null : assetId,
      notes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Input
          id="liability-name"
          label="Debt"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={touched && !nameValid ? "Name the debt." : undefined}
          autoFocus
        />
        <Select
          id="liability-type"
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as LiabilityType)}
        >
          {LIABILITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {LIABILITY_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      <Select
        id="liability-direction"
        label="Direction"
        value={direction}
        onChange={(e) => setDirection(e.target.value as DebtDirection)}
      >
        <option value="owed_by_me">I owe this</option>
        <option value="owed_to_me">Owed to me</option>
      </Select>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Input
          id="liability-balance"
          label="Balance owed"
          inputMode="decimal"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          error={touched && !balanceValid ? "Enter the balance." : undefined}
        />
        <Select
          id="liability-currency"
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

      {owedByMe ? (
        <div className="rounded-sm border border-border bg-surface p-3">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-text-faint">
            Loan terms (optional)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="liability-principal"
              label="Original amount"
              inputMode="decimal"
              placeholder="Optional"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
            <Input
              id="liability-rate"
              label="Rate % (APR)"
              inputMode="decimal"
              placeholder="Optional"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
            <Input
              id="liability-term"
              label="Term (months)"
              inputMode="numeric"
              placeholder="Optional"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <Input
              id="liability-payment"
              label="Payment"
              inputMode="decimal"
              placeholder="Per month"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            />
          </div>
          <div className="mt-3">
            <Input
              id="liability-start"
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {owedByMe && assets.length > 0 ? (
        <SelectMenu
          id="liability-asset"
          label="Secured against"
          value={assetId}
          onChange={setAssetId}
          options={[
            { value: "", label: "Nothing", hint: "Unsecured" },
            ...assets.map((a) => ({
              value: a.id,
              label: a.name,
              hint: a.currency,
            })),
          ]}
        />
      ) : null}

      <Textarea
        id="liability-notes"
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {initial ? "Save changes" : "Add debt"}
        </Button>
      </div>
    </form>
  );
}
