"use client";

import { useState } from "react";
import type { Category, Expense, RecurrenceInterval } from "@/types";
import { RECURRENCE_INTERVALS } from "@/types";
import { CURRENCIES } from "@/lib/finance/currencies";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { CategoryField } from "./CategoryField";
import type { ExpenseInput } from "@/app/(app)/expenses/actions";

const RECURRENCE_LABELS: Record<RecurrenceInterval, string> = {
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function numeric(value: string): number {
  return Number(value.replace(/[\s,]/g, ""));
}

export function ExpenseForm({
  initial,
  base,
  categories,
  pending,
  onSubmit,
  onCancel,
  onError,
}: {
  initial?: Expense;
  base: string;
  categories: Category[];
  pending: boolean;
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? base);
  const [categoryId, setCategoryId] = useState<string | null>(
    initial?.category_id ?? null,
  );
  const [date, setDate] = useState(initial?.date ?? today());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isRecurring, setIsRecurring] = useState(initial?.is_recurring ?? false);
  const [recurrence, setRecurrence] = useState<RecurrenceInterval>(
    initial?.recurrence ?? "monthly",
  );
  const [touched, setTouched] = useState(false);

  const descriptionValid = description.trim() !== "";
  const amountValid =
    amount.trim() !== "" &&
    !Number.isNaN(numeric(amount)) &&
    numeric(amount) >= 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!descriptionValid || !amountValid) return;
    onSubmit({
      description,
      amount,
      currency,
      category_id: categoryId,
      date,
      notes,
      is_recurring: isRecurring,
      recurrence: isRecurring ? recurrence : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={touched && !descriptionValid ? "Describe the expense." : undefined}
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

      <CategoryField
        value={categoryId}
        categories={categories}
        onChange={setCategoryId}
        onError={onError}
      />

      <Input
        id="date"
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className="flex flex-col gap-3 rounded-sm border border-border bg-surface px-3.5 py-3">
        <label className="flex items-center justify-between text-sm text-text">
          Recurring
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 accent-[var(--red)]"
          />
        </label>
        {isRecurring ? (
          <Select
            id="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as RecurrenceInterval)}
          >
            {RECURRENCE_INTERVALS.map((r) => (
              <option key={r} value={r}>
                {RECURRENCE_LABELS[r]}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

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
          {initial ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
