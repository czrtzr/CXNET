"use client";

import { useState } from "react";
import type { AccountRef, Category, Expense } from "@/types";
import { CURRENCY_OPTIONS } from "@/lib/finance/currencies";
import { Input } from "@/components/ui/Input";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { CategoryField } from "./CategoryField";
import type { ExpenseInput } from "@/app/(app)/expenses/actions";

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
  accounts,
  defaultAccountId,
  pending,
  onSubmit,
  onCancel,
  onError,
}: {
  initial?: Expense;
  base: string;
  categories: Category[];
  accounts: AccountRef[];
  defaultAccountId: string | null;
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
  // New entries draw from the expense default account; editing keeps its own.
  const [accountId, setAccountId] = useState<string | null>(
    initial ? initial.account_id : defaultAccountId,
  );
  const [date, setDate] = useState(initial?.date ?? today());
  const [notes, setNotes] = useState(initial?.notes ?? "");
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
      account_id: accountId,
      date,
      notes,
      // Recurrence now lives in the rules engine; a manual entry is a one-time
      // record. Editing a legacy recurring entry keeps the cadence it had.
      is_recurring: initial?.is_recurring ?? false,
      recurrence: initial?.recurrence ?? null,
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
        <SelectMenu
          id="currency"
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={CURRENCY_OPTIONS}
          className="min-w-[6rem]"
        />
      </div>

      <CategoryField
        value={categoryId}
        categories={categories}
        onChange={setCategoryId}
        onError={onError}
      />

      {accounts.length > 0 ? (
        <SelectMenu
          id="account"
          label="Paid from account"
          value={accountId ?? ""}
          onChange={(v) => setAccountId(v || null)}
          options={[
            { value: "", label: "No account" },
            ...accounts.map((a) => ({
              value: a.id,
              label: a.account_name,
              hint: a.currency,
            })),
          ]}
        />
      ) : null}

      <Input
        id="date"
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
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
          {initial ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
