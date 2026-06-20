"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { motion } from "motion/react";
import type { AccountRef, Category, Expense } from "@/types";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseInput,
} from "@/app/(app)/expenses/actions";
import { convertToBase } from "@/lib/finance/currencies";
import { Amount } from "@/components/ui/Amount";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { EmptyState } from "@/components/finance/EmptyState";
import { ChangeView } from "@/components/finance/ChangeView";
import { ExpenseForm } from "./ExpenseForm";

type Props = {
  rows: Expense[];
  categories: Category[];
  accounts: AccountRef[];
  defaultAccountId: string | null;
  base: string;
  rateMap: Record<string, number>;
  canWrite: boolean;
};

type Optimistic =
  | { type: "add"; row: Expense }
  | { type: "update"; row: Expense }
  | { type: "delete"; id: string };

function reduce(state: Expense[], action: Optimistic): Expense[] {
  if (action.type === "add") return [action.row, ...state];
  if (action.type === "update")
    return state.map((r) => (r.id === action.row.id ? action.row : r));
  return state.filter((r) => r.id !== action.id);
}

function numeric(value: number | string): number {
  return Number(String(value).replace(/[\s,]/g, ""));
}

const MONTH_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function monthLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "Undated" : MONTH_FMT.format(d);
}

export function ExpensesView({
  rows,
  categories,
  accounts,
  defaultAccountId,
  base,
  rateMap,
  canWrite,
}: Props) {
  const [optimistic, apply] = useOptimistic(rows, reduce);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const { toast } = useToast();

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  let total = 0;
  let unconverted = 0;
  for (const r of optimistic) {
    const converted = convertToBase(Number(r.amount), r.currency, base, rateMap);
    if (converted == null) unconverted += 1;
    else total += converted;
  }

  // Actual logged spending by date, in base currency, for the change view.
  const flow = useMemo(
    () =>
      optimistic
        .map((r) => {
          const v = convertToBase(Number(r.amount), r.currency, base, rateMap);
          return v == null ? null : { t: new Date(`${r.date}T00:00:00`).getTime(), v };
        })
        .filter((e): e is { t: number; v: number } => e != null),
    [optimistic, base, rateMap],
  );

  // Group newest first by calendar month for the list.
  const groups: { label: string; rows: Expense[] }[] = [];
  for (const row of optimistic) {
    const label = monthLabel(row.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }

  function submit(input: ExpenseInput) {
    const target = editing;
    setOpen(false);
    setEditing(null);
    start(async () => {
      if (target) {
        apply({
          type: "update",
          row: {
            ...target,
            description: input.description,
            amount: numeric(input.amount),
            currency: input.currency,
            category_id: input.category_id,
            account_id: input.account_id ?? null,
            date: input.date,
            notes: input.notes ?? null,
            is_recurring: input.is_recurring,
            recurrence: input.recurrence,
          },
        });
        const res = await updateExpense(target.id, input);
        if (!res.ok) toast(res.error, "error");
      } else {
        apply({
          type: "add",
          row: {
            id: `temp-${Date.now()}`,
            user_id: "",
            created_at: new Date().toISOString(),
            description: input.description,
            amount: numeric(input.amount),
            currency: input.currency,
            category_id: input.category_id,
            account_id: input.account_id ?? null,
            posted_amount: null,
            date: input.date,
            notes: input.notes ?? null,
            is_recurring: input.is_recurring,
            recurrence: input.recurrence,
          },
        });
        const res = await createExpense(input);
        if (!res.ok) toast(res.error, "error");
      }
    });
  }

  function remove(row: Expense) {
    start(async () => {
      apply({ type: "delete", id: row.id });
      const res = await deleteExpense(row.id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  return (
    <PageTransition>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
            Expenses
          </p>
          <p className="mt-3 font-serif text-4xl tracking-tight text-text">
            <Amount value={total} currency={base} quiet />
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Total logged
            {unconverted > 0 ? `, plus ${unconverted} in other currencies` : ""}
          </p>
        </div>
        {canWrite ? (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add expense
          </Button>
        ) : null}
      </div>

      {optimistic.length > 0 ? (
        <ChangeView entries={flow} currency={base} higherIsBetter={false} />
      ) : null}

      {optimistic.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          hint="Log what leaves the account to watch your spending by category and month."
          action={
            canWrite ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Add expense
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-text-faint">
                {group.label}
              </p>
              <div className="flex flex-col gap-2">
                {group.rows.map((row) => {
                  const category = row.category_id
                    ? categoryById.get(row.category_id)
                    : undefined;
                  const isTemp = row.id.startsWith("temp-");
                  return (
                    <motion.div
                      key={row.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: isTemp ? 0.6 : 1, y: 0 }}
                    >
                      <Card
                        className="group flex items-center justify-between gap-4 border-l-2 px-5 py-4"
                        style={{
                          borderLeftColor: category?.color ?? "var(--border)",
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <p className="truncate text-sm text-text">
                              {row.description}
                            </p>
                            {row.is_recurring ? (
                              <Badge tone="neutral">Recurring</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-text-faint">
                            {category ? `${category.name} · ` : ""}
                            {row.date}
                            {row.account_id && accountMap.has(row.account_id)
                              ? ` · ${accountMap.get(row.account_id)!.account_name}`
                              : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-5">
                          <Amount
                            value={Number(row.amount)}
                            currency={row.currency}
                            quiet
                            className="text-sm"
                          />
                          {canWrite && !isTemp ? (
                            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditing(row);
                                  setOpen(true);
                                }}
                                className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-text"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => remove(row)}
                                className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-neg"
                              >
                                Remove
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit expense" : "Add expense"}
      >
        <ExpenseForm
          initial={editing ?? undefined}
          base={base}
          categories={categories}
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          pending={pending}
          onSubmit={submit}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
          onError={(message) => toast(message, "error")}
        />
      </Modal>
    </PageTransition>
  );
}
