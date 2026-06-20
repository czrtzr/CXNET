"use client";

import { useOptimistic, useState, useTransition } from "react";
import { motion } from "motion/react";
import type { Saving, Transfer } from "@/types";
import {
  createSaving,
  updateSaving,
  deleteSaving,
  reconcileSaving,
  createTransfer,
  deleteTransfer,
  type SavingInput,
  type TransferInput,
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
import { TransferDialog } from "./TransferDialog";

export type Adjustment = { net: number; count: number };

type Props = {
  rows: Saving[];
  transfers: Transfer[];
  adjustments: Record<string, Adjustment>;
  base: string;
  rateMap: Record<string, number>;
  canWrite: boolean;
};

type Optimistic =
  | { type: "add"; row: Saving }
  | { type: "update"; row: Saving }
  | { type: "delete"; id: string }
  | { type: "balance"; id: string; balance: number }
  | { type: "adjust"; id: string; delta: number };

function reduce(state: Saving[], action: Optimistic): Saving[] {
  if (action.type === "add") return [action.row, ...state];
  if (action.type === "update")
    return state.map((r) => (r.id === action.row.id ? action.row : r));
  if (action.type === "balance")
    return state.map((r) =>
      r.id === action.id ? { ...r, balance: action.balance } : r,
    );
  if (action.type === "adjust")
    return state.map((r) =>
      r.id === action.id ? { ...r, balance: Number(r.balance) + action.delta } : r,
    );
  return state.filter((r) => r.id !== action.id);
}

type TransferAction = { type: "add"; row: Transfer } | { type: "delete"; id: string };

function transferReduce(state: Transfer[], action: TransferAction): Transfer[] {
  if (action.type === "add") return [action.row, ...state];
  return state.filter((t) => t.id !== action.id);
}

function numeric(value: number | string): number {
  return Number(String(value).replace(/[\s,]/g, ""));
}

export function SavingsView({
  rows,
  transfers,
  adjustments,
  base,
  rateMap,
  canWrite,
}: Props) {
  const [optimistic, apply] = useOptimistic(rows, reduce);
  const [optTransfers, applyTransfer] = useOptimistic(transfers, transferReduce);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Saving | null>(null);
  const [reconciling, setReconciling] = useState<Saving | null>(null);
  const [transferring, setTransferring] = useState(false);
  const { toast } = useToast();

  const accountName = new Map(optimistic.map((r) => [r.id, r.account_name]));
  const accountRefs = optimistic.map((r) => ({
    id: r.id,
    account_name: r.account_name,
    currency: r.currency,
  }));

  let total = 0;
  let unconverted = 0;
  for (const r of optimistic) {
    const converted = convertToBase(Number(r.balance), r.currency, base, rateMap);
    if (converted == null) unconverted += 1;
    else total += converted;
  }

  function confirmTransfer(input: TransferInput) {
    setTransferring(false);
    const from = optimistic.find((r) => r.id === input.from_account);
    const to = optimistic.find((r) => r.id === input.to_account);
    if (!from || !to) return;
    const fromAmount = numeric(String(input.from_amount));
    const toAmount = numeric(String(input.to_amount));
    start(async () => {
      applyTransfer({
        type: "add",
        row: {
          id: `temp-${Date.now()}`,
          user_id: "",
          from_account: input.from_account,
          to_account: input.to_account,
          from_amount: fromAmount,
          from_currency: from.currency,
          to_amount: toAmount,
          to_currency: to.currency,
          note: input.note ?? null,
          occurred_at: input.occurred_at,
          created_at: new Date().toISOString(),
        },
      });
      apply({ type: "adjust", id: from.id, delta: -fromAmount });
      apply({ type: "adjust", id: to.id, delta: toAmount });
      const res = await createTransfer(input);
      if (res.ok) toast("Transfer recorded.", "success");
      else toast(res.error, "error");
    });
  }

  function removeTransfer(t: Transfer) {
    start(async () => {
      applyTransfer({ type: "delete", id: t.id });
      if (t.from_account) apply({ type: "adjust", id: t.from_account, delta: Number(t.from_amount) });
      if (t.to_account) apply({ type: "adjust", id: t.to_account, delta: -Number(t.to_amount) });
      const res = await deleteTransfer(t.id);
      if (!res.ok) toast(res.error, "error");
    });
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
          <div className="flex items-center gap-2">
            {optimistic.length >= 2 ? (
              <Button variant="outline" onClick={() => setTransferring(true)}>
                Transfer
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Add account
            </Button>
          </div>
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

      {optTransfers.length > 0 ? (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-[0.18em] text-text-faint">
            Transfers
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {optTransfers.map((t) => {
              const isTemp = t.id.startsWith("temp-");
              const fromName = t.from_account
                ? accountName.get(t.from_account) ?? "Removed account"
                : "Removed account";
              const toName = t.to_account
                ? accountName.get(t.to_account) ?? "Removed account"
                : "Removed account";
              const crossCurrency = t.from_currency !== t.to_currency;
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: isTemp ? 0.6 : 1, y: 0 }}
                >
                  <Card className="group flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">
                        {fromName} <span className="text-text-faint">→</span> {toName}
                      </p>
                      <p className="mt-1 text-xs text-text-faint">
                        {t.occurred_at}
                        {t.note ? ` · ${t.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Amount
                          value={Number(t.from_amount)}
                          currency={t.from_currency}
                          quiet
                          className="text-sm"
                        />
                        {crossCurrency ? (
                          <p className="mt-0.5 text-xs text-text-faint">
                            <Amount
                              value={Number(t.to_amount)}
                              currency={t.to_currency}
                              tone="muted"
                              quiet
                            />{" "}
                            received
                          </p>
                        ) : null}
                      </div>
                      {canWrite && !isTemp ? (
                        <button
                          type="button"
                          onClick={() => removeTransfer(t)}
                          className="rounded-sm px-2 py-1 text-xs text-text-muted opacity-0 transition hover:bg-surface-hover hover:text-neg group-hover:opacity-100"
                        >
                          Undo
                        </button>
                      ) : null}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : null}

      <TransferDialog
        open={transferring}
        accounts={accountRefs}
        rateMap={rateMap}
        pending={pending}
        onClose={() => setTransferring(false)}
        onConfirm={confirmTransfer}
      />

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
