"use client";

import { useState } from "react";
import type {
  AccountRef,
  Category,
  CategoryKind,
  RecurrenceInterval,
  RecurringRule,
} from "@/types";
import { RECURRENCE_INTERVALS, RECURRENCE_LABELS } from "@/types";
import { CURRENCY_OPTIONS } from "@/lib/finance/currencies";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { RuleInput } from "@/app/(app)/recurring/actions";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Create or edit a recurring rule. anchor (start) date is set once at creation
// and shown read-only afterwards, so editing the amount never reshuffles the
// occurrences already generated.
export function RuleForm({
  initial,
  kind,
  base,
  accounts,
  categories,
  defaultAccountId,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: RecurringRule;
  kind: CategoryKind;
  base: string;
  accounts: AccountRef[];
  categories: Category[];
  defaultAccountId: string | null;
  pending: boolean;
  onSubmit: (input: RuleInput) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? base);
  const [cadence, setCadence] = useState<RecurrenceInterval>(
    initial?.cadence ?? "monthly",
  );
  const [accountId, setAccountId] = useState(
    initial?.account_id ?? defaultAccountId ?? "",
  );
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [anchor, setAnchor] = useState(initial?.anchor_date ?? today());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [touched, setTouched] = useState(false);

  const labelValid = label.trim() !== "";
  const amountValid =
    amount.trim() !== "" && !Number.isNaN(Number(amount.replace(/[\s,]/g, "")));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!labelValid || !amountValid) return;
    onSubmit({
      kind,
      label,
      amount,
      currency,
      account_id: accountId === "" ? null : accountId,
      category_id: categoryId === "" ? null : categoryId,
      cadence,
      anchor_date: anchor,
      notes,
    });
  }

  const noun = kind === "income" ? "income" : "expense";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="rule-label"
        label={kind === "income" ? "Source" : "Description"}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        error={touched && !labelValid ? "Name it." : undefined}
        autoFocus
      />

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Input
          id="rule-amount"
          label="Amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={touched && !amountValid ? "Enter an amount." : undefined}
        />
        <SelectMenu
          id="rule-currency"
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={CURRENCY_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="rule-cadence"
          label="Repeats"
          value={cadence}
          onChange={(e) => setCadence(e.target.value as RecurrenceInterval)}
        >
          {RECURRENCE_INTERVALS.map((c) => (
            <option key={c} value={c}>
              {RECURRENCE_LABELS[c]}
            </option>
          ))}
        </Select>
        {initial ? (
          <Input id="rule-anchor" label="Started" value={anchor} disabled />
        ) : (
          <Input
            id="rule-anchor"
            label="Starts"
            type="date"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
          />
        )}
      </div>

      {accounts.length > 0 ? (
        <SelectMenu
          id="rule-account"
          label="Posts to account"
          value={accountId}
          onChange={setAccountId}
          options={[
            { value: "", label: "No account", hint: "Does not move a balance" },
            ...accounts.map((a) => ({
              value: a.id,
              label: a.account_name,
              hint: a.currency,
            })),
          ]}
        />
      ) : null}

      {categories.length > 0 ? (
        <SelectMenu
          id="rule-category"
          label="Category"
          value={categoryId}
          onChange={setCategoryId}
          options={[
            { value: "", label: "Uncategorized", hint: `No ${noun} category` },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      ) : null}

      <Textarea
        id="rule-notes"
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {initial ? "Save changes" : "Add recurring"}
        </Button>
      </div>
    </form>
  );
}
