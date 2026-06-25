"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import type { AccountRef, Category, Income, RecurringRule } from "@/types";
import {
  createIncome,
  updateIncome,
  deleteIncome,
  type IncomeInput,
} from "@/app/(app)/income/actions";
import { recurrenceMonthly } from "@/lib/finance/calculations";
import { convertToBase } from "@/lib/finance/currencies";
import { Amount } from "@/components/ui/Amount";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast, useDemoGuard } from "@/components/ui/Toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { AnimatedList, AnimatedItem } from "@/components/motion/AnimatedList";
import { DrawUnderline } from "@/components/svg/DrawUnderline";
import { PulseLine } from "@/components/svg/PulseLine";
import { EmptyState } from "@/components/finance/EmptyState";
import { ChangeView } from "@/components/finance/ChangeView";
import { RecurringRulesPanel } from "@/components/finance/RecurringRulesPanel";
import { FilterBar } from "@/components/finance/FilterBar";
import {
  EMPTY_FILTERS,
  matchesFilters,
  type EntryFilters,
} from "@/lib/finance/filters";
import { IncomeForm } from "./IncomeForm";

type Props = {
  rows: Income[];
  categories: Category[];
  accounts: AccountRef[];
  rules: RecurringRule[];
  defaultAccountId: string | null;
  base: string;
  rateMap: Record<string, number>;
  canWrite: boolean;
};

type Optimistic =
  | { type: "add"; row: Income }
  | { type: "update"; row: Income }
  | { type: "delete"; id: string };

function reduce(state: Income[], action: Optimistic): Income[] {
  if (action.type === "add") return [action.row, ...state];
  if (action.type === "update")
    return state.map((r) => (r.id === action.row.id ? action.row : r));
  return state.filter((r) => r.id !== action.id);
}

export function IncomeView({
  rows,
  categories,
  accounts,
  rules,
  defaultAccountId,
  base,
  rateMap,
  canWrite,
}: Props) {
  const [optimistic, apply] = useOptimistic(rows, reduce);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const { toast } = useToast();
  const guard = useDemoGuard(canWrite);
  const [filters, setFilters] = useState<EntryFilters>(EMPTY_FILTERS);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Only categories and accounts that the entries actually use, plus an "all"
  // entry, so the dropdowns never offer a choice that filters to nothing.
  const usedCategoryIds = new Set(rows.map((r) => r.category_id).filter(Boolean));
  const usedAccountIds = new Set(rows.map((r) => r.account_id).filter(Boolean));
  const categoryOptions = [
    { value: "", label: "All categories" },
    ...categories
      .filter((c) => usedCategoryIds.has(c.id))
      .map((c) => ({ value: c.id, label: c.name })),
  ];
  const accountOptions = [
    { value: "", label: "All accounts" },
    ...accounts
      .filter((a) => usedAccountIds.has(a.id))
      .map((a) => ({ value: a.id, label: a.account_name, hint: a.currency })),
  ];

  const filtered = optimistic.filter((r) =>
    matchesFilters(r, filters, (row) => row.source),
  );

  // Monthly equivalent of recurring income, summed from the active rules.
  let monthlyTotal = 0;
  for (const rule of rules) {
    if (!rule.active) continue;
    const v = convertToBase(
      recurrenceMonthly(Number(rule.amount), rule.cadence),
      rule.currency,
      base,
      rateMap,
    );
    if (v != null) monthlyTotal += v;
  }

  // Actual logged income by date, in base currency, for the change view.
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

  function submit(input: IncomeInput) {
    const target = editing;
    setOpen(false);
    setEditing(null);
    start(async () => {
      if (target) {
        apply({
          type: "update",
          row: {
            ...target,
            ...input,
            amount: Number(String(input.amount).replace(/[\s,]/g, "")),
            category_id: input.category_id ?? null,
            account_id: input.account_id ?? null,
          },
        });
        const res = await updateIncome(target.id, input);
        if (!res.ok) toast(res.error, "error");
      } else {
        apply({
          type: "add",
          row: {
            id: `temp-${Date.now()}`,
            user_id: "",
            created_at: new Date().toISOString(),
            source: input.source,
            amount: Number(String(input.amount).replace(/[\s,]/g, "")),
            currency: input.currency,
            category_id: input.category_id ?? null,
            account_id: input.account_id ?? null,
            posted_amount: null,
            date: input.date,
            notes: input.notes ?? null,
          },
        });
        const res = await createIncome(input);
        if (!res.ok) toast(res.error, "error");
      }
    });
  }

  function remove(row: Income) {
    start(async () => {
      apply({ type: "delete", id: row.id });
      const res = await deleteIncome(row.id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  return (
    <PageTransition>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
            Income
          </p>
          <p className="mt-3 font-serif text-4xl tracking-tight text-text">
            <Amount value={monthlyTotal} currency={base} quiet code />
          </p>
          <DrawUnderline width={150} className="mt-1 text-brass" />
          <p className="mt-2 text-xs text-text-muted">Monthly equivalent</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Button
            onClick={guard(() => {
              setEditing(null);
              setOpen(true);
            })}
          >
            Add income
          </Button>
          <PulseLine
            width={140}
            height={30}
            className="hidden text-pos/70 sm:block"
          />
        </div>
      </div>

      {optimistic.length > 0 ? (
        <ChangeView entries={flow} currency={base} higherIsBetter />
      ) : null}

      <RecurringRulesPanel
        rules={rules}
        kind="income"
        base={base}
        rateMap={rateMap}
        accounts={accounts}
        categories={categories}
        defaultAccountId={defaultAccountId}
        canWrite={canWrite}
      />

      {optimistic.length > 0 ? (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          categoryOptions={categoryOptions}
          accountOptions={accountOptions}
          searchPlaceholder="Search by source or note"
        />
      ) : null}

      {optimistic.length === 0 ? (
        <EmptyState
          title="No income yet"
          hint="Add a salary, a client, or any recurring source to see your monthly figure take shape."
          action={
            <Button
              onClick={guard(() => {
                setEditing(null);
                setOpen(true);
              })}
            >
              Add income
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          hint="No income fits these filters. Try widening the range or clearing them."
        />
      ) : (
        <AnimatedList className="mt-4 flex flex-col gap-2">
          {filtered.map((row) => {
            const isTemp = row.id.startsWith("temp-");
            return (
              <AnimatedItem key={row.id}>
                <Card
                  className={`group flex items-center justify-between gap-4 px-5 py-4 ${
                    isTemp ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate text-sm text-text">{row.source}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-faint">
                      <span>{row.date}</span>
                      {row.category_id && categoryMap.has(row.category_id) ? (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: categoryMap.get(row.category_id)!.color,
                            }}
                          />
                          {categoryMap.get(row.category_id)!.name}
                        </span>
                      ) : null}
                      {row.account_id && accountMap.has(row.account_id) ? (
                        <span className="text-text-faint">
                          · {accountMap.get(row.account_id)!.account_name}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <Amount
                        value={Number(row.amount)}
                        currency={row.currency}
                        quiet
                        code
                        className="text-sm"
                      />
                    </div>

                    {!isTemp ? (
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={guard(() => {
                            setEditing(row);
                            setOpen(true);
                          })}
                          className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-text"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={guard(() => remove(row))}
                          className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-neg"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </AnimatedItem>
            );
          })}
        </AnimatedList>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit income" : "Add income"}
      >
        <IncomeForm
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
