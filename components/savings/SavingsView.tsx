"use client";

import { useOptimistic, useState, useTransition } from "react";
import { motion } from "motion/react";
import type { AccountLogEntry, Saving, Transfer } from "@/types";
import { ACCOUNT_TYPE_LABELS } from "@/types";
import {
  createSaving,
  updateSaving,
  deleteSaving,
  reconcileSaving,
  createTransfer,
  deleteTransfer,
  type SavingInput,
  type TransferInput,
} from "@/app/(app)/accounts/actions";
import { goalProgress } from "@/lib/finance/calculations";
import { convertToBase } from "@/lib/finance/currencies";
import { formatPercent } from "@/lib/finance/format";
import { Amount } from "@/components/ui/Amount";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast, useDemoGuard } from "@/components/ui/Toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { DrawUnderline } from "@/components/svg/DrawUnderline";
import { PulseLine } from "@/components/svg/PulseLine";
import { EmptyState } from "@/components/finance/EmptyState";
import { SavingForm } from "./SavingForm";
import { ReconcileDialog } from "./ReconcileDialog";
import { TransferDialog } from "./TransferDialog";

export type Adjustment = { net: number; count: number };

type Props = {
  rows: Saving[];
  transfers: Transfer[];
  adjustments: Record<string, Adjustment>;
  // Live value of positions held in each account, in the account's own currency.
  linkedValues: Record<string, number>;
  // Activity log per account, newest first.
  logs: Record<string, AccountLogEntry[]>;
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

const LOG_KIND_LABEL: Record<AccountLogEntry["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  reconcile: "Adjustment",
};

// The expandable per-account ledger. Every leg is signed in the account's own
// currency, money in green and money out oxblood, newest first.
function AccountLog({ entries }: { entries: AccountLogEntry[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      {entries.length === 0 ? (
        <p className="mt-3 border-t border-border pt-3 text-xs text-text-faint">
          No activity yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 border-t border-border pt-3">
          {entries.slice(0, 20).map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate text-text-muted">{e.label}</p>
                <p className="text-text-faint">
                  {LOG_KIND_LABEL[e.kind]} · {e.date}
                </p>
              </div>
              <Amount
                value={e.amount}
                currency={e.currency}
                signed
                tone={e.amount >= 0 ? "pos" : "neg"}
                className="shrink-0"
              />
            </li>
          ))}
          {entries.length > 20 ? (
            <li className="text-xs text-text-faint">
              +{entries.length - 20} more
            </li>
          ) : null}
        </ul>
      )}
    </motion.div>
  );
}

export function SavingsView({
  rows,
  transfers,
  adjustments,
  linkedValues,
  logs,
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
  const [transferFrom, setTransferFrom] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const { toast } = useToast();
  const guard = useDemoGuard(canWrite);

  const multipleAccounts = optimistic.length >= 2;
  function openTransfer(fromId: string | null) {
    setTransferFrom(fromId);
    setTransferring(true);
  }

  const accountName = new Map(optimistic.map((r) => [r.id, r.account_name]));
  const accountRefs = optimistic.map((r) => ({
    id: r.id,
    account_name: r.account_name,
    account_type: r.account_type,
    currency: r.currency,
  }));

  // Each account's effective balance is its cash balance plus the live value of
  // any positions held inside it (mirrored, in the account's currency).
  const effectiveBalance = (r: Saving) =>
    Number(r.balance) + (linkedValues[r.id] ?? 0);

  let total = 0;
  let unconverted = 0;
  for (const r of optimistic) {
    const converted = convertToBase(effectiveBalance(r), r.currency, base, rateMap);
    if (converted == null) unconverted += 1;
    else total += converted;
  }

  function confirmTransfer(input: TransferInput) {
    setTransferring(false);
    setTransferFrom(null);
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
        account_type: input.account_type ?? "savings",
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
            Accounts
          </p>
          <p className="mt-3 font-serif text-4xl tracking-tight text-text">
            <Amount value={total} currency={base} quiet code />
          </p>
          <DrawUnderline width={150} className="mt-1 text-brass" />
          <p className="mt-2 text-xs text-text-muted">
            Across {optimistic.length}{" "}
            {optimistic.length === 1 ? "account" : "accounts"}
            {unconverted > 0 ? `, plus ${unconverted} in other currencies` : ""}
          </p>
          <PulseLine width={150} height={26} className="mt-3 text-brass/55" />
        </div>
        <div className="flex items-center gap-2">
          {multipleAccounts ? (
            <Button variant="outline" onClick={guard(() => openTransfer(null))}>
              Transfer
            </Button>
          ) : null}
          <Button
            onClick={guard(() => {
              setEditing(null);
              setOpen(true);
            })}
          >
            Add account
          </Button>
        </div>
      </div>

      {optimistic.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          hint="Add a savings account and set a goal to track progress toward it."
          action={
            <Button
              onClick={guard(() => {
                setEditing(null);
                setOpen(true);
              })}
            >
              Add account
            </Button>
          }
        />
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {optimistic.map((row) => {
            const linked = linkedValues[row.id] ?? 0;
            const effective = effectiveBalance(row);
            const log = logs[row.id] ?? [];
            const logOpen = expandedLog === row.id;
            const progress = goalProgress(effective, row.goal_amount);
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
                      <p className="mt-0.5 truncate text-xs text-text-faint">
                        <span className="uppercase tracking-[0.14em]">
                          {ACCOUNT_TYPE_LABELS[row.account_type]}
                        </span>
                        {row.institution ? ` · ${row.institution}` : ""}
                      </p>
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
                    <Amount value={effective} currency={row.currency} quiet code />
                  </p>
                  {linked !== 0 ? (
                    <p className="mt-1 text-xs text-text-faint">
                      Includes{" "}
                      <Amount value={linked} currency={row.currency} tone="muted" />{" "}
                      in investments
                    </p>
                  ) : null}

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

                  {!isTemp ? (
                    <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={guard(() => setReconciling(row))}
                      >
                        Set actual balance
                      </Button>
                      <button
                        type="button"
                        onClick={() => setExpandedLog(logOpen ? null : row.id)}
                        aria-expanded={logOpen}
                        className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-text"
                      >
                        {logOpen ? "Hide log" : `Log${log.length ? ` · ${log.length}` : ""}`}
                      </button>
                      {multipleAccounts ? (
                        <button
                          type="button"
                          onClick={guard(() => openTransfer(row.id))}
                          className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-text"
                        >
                          Transfer
                        </button>
                      ) : null}
                      <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
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
                    </div>
                  ) : null}

                  {logOpen ? (
                    <AccountLog entries={log} />
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
                      {!isTemp ? (
                        <button
                          type="button"
                          onClick={guard(() => removeTransfer(t))}
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
        presetFrom={transferFrom ?? undefined}
        onClose={() => {
          setTransferring(false);
          setTransferFrom(null);
        }}
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
