"use client";

import { useState } from "react";
import type { Category, Income, IncomeFrequency } from "@/types";
import { INCOME_FREQUENCIES } from "@/types";
import { CURRENCY_OPTIONS } from "@/lib/finance/currencies";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { CategoryField } from "@/components/expenses/CategoryField";
import type { IncomeInput } from "@/app/(app)/income/actions";

const FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  biweekly: "Every two weeks",
  annual: "Annual",
  one_time: "One time",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IncomeForm({
  initial,
  base,
  categories,
  pending,
  onSubmit,
  onCancel,
  onError,
}: {
  initial?: Income;
  base: string;
  categories: Category[];
  pending: boolean;
  onSubmit: (input: IncomeInput) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [source, setSource] = useState(initial?.source ?? "");
  const [amount, setAmount] = useState(
    initial ? String(initial.amount) : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? base);
  const [frequency, setFrequency] = useState<IncomeFrequency>(
    initial?.frequency ?? "one_time",
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    initial?.category_id ?? null,
  );
  const [date, setDate] = useState(initial?.date ?? today());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [touched, setTouched] = useState(false);

  const amountValid = amount.trim() !== "" && Number(amount.replace(/[\s,]/g, "")) >= 0 && !Number.isNaN(Number(amount.replace(/[\s,]/g, "")));
  const sourceValid = source.trim() !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!sourceValid || !amountValid) return;
    onSubmit({
      source,
      amount,
      currency,
      frequency,
      category_id: categoryId,
      date,
      notes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="source"
        label="Source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        error={touched && !sourceValid ? "Name the source." : undefined}
        autoFocus
      />

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Input
          id="amount"
          label="Amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={touched && !amountValid ? "Enter an amount." : undefined}
        />
        <SelectMenu
          id="currency"
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={CURRENCY_OPTIONS}
          className="min-w-[6rem]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="frequency"
          label="Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}
        >
          {INCOME_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABELS[f]}
            </option>
          ))}
        </Select>
        <Input
          id="date"
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <CategoryField
        value={categoryId}
        categories={categories}
        onChange={setCategoryId}
        onError={onError}
        kind="income"
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
          {initial ? "Save changes" : "Add income"}
        </Button>
      </div>
    </form>
  );
}
