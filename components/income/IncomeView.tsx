"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { motion } from "motion/react";
import type { Category, Income } from "@/types";
import {
  createIncome,
  updateIncome,
  deleteIncome,
  type IncomeInput,
} from "@/app/(app)/income/actions";
import { monthlyEquivalent } from "@/lib/finance/calculations";
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
import { IncomeForm } from "./IncomeForm";

type Props = {
  rows: Income[];
  categories: Category[];
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

const FREQUENCY_BADGE: Record<Income["frequency"], string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  biweekly: "Biweekly",
  annual: "Annual",
  one_time: "One time",
};

export function IncomeView({ rows, categories, base, rateMap, canWrite }: Props) {
  const [optimistic, apply] = useOptimistic(rows, reduce);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const { toast } = useToast();

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  let monthlyTotal = 0;
  let unconverted = 0;
  for (const r of optimistic) {
    const monthly = monthlyEquivalent(Number(r.amount), r.frequency);
    if (monthly === 0) continue;
    const converted = convertToBase(monthly, r.currency, base, rateMap);
    if (converted == null) unconverted += 1;
    else monthlyTotal += converted;
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
            frequency: input.frequency,
            category_id: input.category_id ?? null,
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
            <Amount value={monthlyTotal} currency={base} quiet />
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Monthly equivalent
            {unconverted > 0
              ? `, plus ${unconverted} in other currencies`
              : ""}
          </p>
        </div>
        {canWrite ? (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add income
          </Button>
        ) : null}
      </div>

      {optimistic.length > 0 ? (
        <ChangeView entries={flow} currency={base} higherIsBetter />
      ) : null}

      {optimistic.length === 0 ? (
        <EmptyState
          title="No income yet"
          hint="Add a salary, a client, or any recurring source to see your monthly figure take shape."
          action={
            canWrite ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Add income
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-8 flex flex-col gap-2">
          {optimistic.map((row) => {
            const monthly = monthlyEquivalent(Number(row.amount), row.frequency);
            const monthlyBase = convertToBase(monthly, row.currency, base, rateMap);
            const isTemp = row.id.startsWith("temp-");
            return (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: isTemp ? 0.6 : 1, y: 0 }}
              >
                <Card className="group flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate text-sm text-text">{row.source}</p>
                      <Badge>{FREQUENCY_BADGE[row.frequency]}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-text-faint">
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
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <Amount
                        value={Number(row.amount)}
                        currency={row.currency}
                        quiet
                        className="text-sm"
                      />
                      {row.frequency !== "one_time" && monthlyBase != null ? (
                        <p className="mt-0.5 text-xs text-text-faint">
                          <Amount
                            value={monthlyBase}
                            currency={base}
                            tone="muted"
                            quiet
                          />
                          {" / mo"}
                        </p>
                      ) : null}
                    </div>

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
