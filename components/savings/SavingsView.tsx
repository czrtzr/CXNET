"use client";

import { useOptimistic, useState, useTransition } from "react";
import { motion } from "motion/react";
import type { Saving } from "@/types";
import {
  createSaving,
  updateSaving,
  deleteSaving,
  reconcileSaving,
  type SavingInput,
} from "@/app/(app)/savings/actions";
import { goalProgress } from "@/lib/finance/calculations";
import { convertToBase } from "@/lib/finance/currencies";
import { formatPercent } from "@/lib/finance/format";
import { Amount } from "@/components/ui/Amount";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { EmptyState } from "@/components/finance/EmptyState";
import { SavingForm } from "./SavingForm";
import { ReconcileDialog } from "./ReconcileDialog";

export type Adjustment = { net: number; count: number };

type Props = {
  rows: Saving[];
  adjustments: Record<string, Adjustment>;
  base: string;
  rateMap: Record<string, number>;
  canWrite: boolean;
};

type Optimistic =
  | { type: "add"; row: Saving }
  | { type: "update"; row: Saving }
  | { type: "delete"; id: string }
  | { type: "balance"; id: string; balance: number };

function reduce(state: Saving[], action: Optimistic): Saving[] {
  if (action.type === "add") return [action.row, ...state];
  if (action.type === "update")
    return state.map((r) => (r.id === action.row.id ? action.row : r));
  if (action.type === "balance")
    return state.map((r) =>
      r.id === action.id ? { ...r, balance: action.balance } : r,
    );
  return state.filter((r) => r.id !== action.id);
}

function numeric(value: number | string): number {
  return Number(String(value).replace(/[\s,]/g, ""));
}

export function SavingsView({
  rows,
  adjustments,
  base,
  rateMap,
  canWrite,
}: Props) {
  const [optimistic, apply] = useOptimistic(rows, reduce);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Saving | null>(null);
  const [reconciling, setReconciling] = useState<Saving | null>(null);
  const { toast } = useToast();

  let total = 0;
  let unconverted = 0;
  for (const r of optimistic) {
    const converted = convertToBase(Number(r.balance), r.currency, base, rateMap);
    if (converted == null) unconverted += 1;
    else total += converted;
  }

  function submit(input: SavingInput) {
    const target = editing;
    setOpen(false);
    setEditing(null);
    start(async () => {
      const shaped = {
        account_name: input.account_name,
        balance: numeric(input.balance),
        currency: input.currency,
        goal_amount: input.goal_amount == null || input.goal_amount === "" ? null : numeric(input.goal_amount),
        apy: input.apy == null || input.apy === "" ? null : numeric(input.apy),
        institution: input.institution || null,
        notes: input.notes ?? null,
      };
      if (target) {
        apply({ type: "update", row: { ...target, ...shaped } });
        const res = await updateSaving(target.id, input);
        if (!res.ok) toast(res.error, "error");
      } else {
        apply({
          type: "add",
          row: {
            id: `temp-${Date.now()}`,
            user_id: "",
            created_at: new Date().toISOString(),
            ...shaped,
          },
        });
        const res = await createSaving(input);
        if (!res.ok) toast(res.error, "error");
      }
    });
  }

  function remove(row: Saving) {
    start(async () => {
      apply({ type: "delete", id: row.id });
      const res = await deleteSaving(row.id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  function confirmReconcile(actual: string, note: string) {
    const target = reconciling;
    setReconciling(null);
    if (!target) return;
    start(async () => {
      apply({ type: "balance", id: target.id, balance: numeric(actual) });
      const res = await reconcileSaving(target.id, actual, note);
      if (res.ok) toast("Balance set.", "success");
      else toast(res.error, "error");
    });
  }

  return (
    <PageTransition>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
            Savings
          </p>
          <p className="mt-3 font-serif text-4xl tracking-tight text-text">
            <Amount value={total} currency={base} quiet />
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Across {optimistic.length}{" "}
            {optimistic.length === 1 ? "account" : "accounts"}
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
            Add account
          </Button>
        ) : null}
      </div>

      {optimistic.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          hint="Add a savings account and set a goal to track progress toward it."
          action={
            canWrite ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Add account
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {optimistic.map((row) => {
            const progress = goalProgress(Number(row.balance), row.goal_amount);
            const adjustment = adjustments[row.id];
            const isTemp = row.id.startsWith("temp-");
            return (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: isTemp ? 0.6 : 1, y: 0 }}
              >
                <Card className="group flex h-full flex-col px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">
                        {row.account_name}
                      </p>
                      {row.institution ? (
                        <p className="mt-0.5 truncate text-xs text-text-faint">
                          {row.institution}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {row.apy != null ? (
                        <Badge tone="neutral">
                          {formatPercent(Number(row.apy))} APY
                        </Badge>
                      ) : null}
                      {adjustment && adjustment.count > 0 ? (
                        <Badge tone="manual">Adjusted</Badge>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-4 font-serif text-2xl tracking-tight text-text">
                    <Amount value={Number(row.balance)} currency={row.currency} quiet />
                  </p>

                  {progress != null ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-text-faint">
                        <span>Goal</span>
                        <span>{formatPercent(Math.min(progress, 100), { decimals: 0 })}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                        <motion.div
                          className="h-full rounded-full bg-leather-light"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {adjustment && adjustment.count > 0 ? (
                    <p className="mt-3 text-xs text-text-faint">
                      Adjusted by{" "}
                      <Amount
                        value={adjustment.net}
                        currency={row.currency}
                        signed
                        tone={adjustment.net >= 0 ? "pos" : "neg"}
                      />{" "}
                      across {adjustment.count}{" "}
                      {adjustment.count === 1 ? "entry" : "entries"}
                    </p>
                  ) : null}

                  {canWrite && !isTemp ? (
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReconciling(row)}
                      >
                        Set actual balance
                      </Button>
                      <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
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
                    </div>
                  ) : null}
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
        title={editing ? "Edit account" : "Add account"}
      >
        <SavingForm
          initial={editing ?? undefined}
          base={base}
          pending={pending}
          onSubmit={submit}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <ReconcileDialog
        saving={reconciling}
        open={reconciling != null}
        pending={pending}
        onClose={() => setReconciling(null)}
        onConfirm={confirmReconcile}
      />
    </PageTransition>
  );
}
