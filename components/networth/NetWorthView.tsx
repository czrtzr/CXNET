"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { Asset, Liability, DebtPayment } from "@/types";
import {
  ASSET_TYPE_LABELS,
  LIABILITY_TYPE_LABELS,
} from "@/types";
import {
  createAsset,
  updateAsset,
  deleteAsset,
  createLiability,
  updateLiability,
  deleteLiability,
  recordDebtPayment,
  deleteDebtPayment,
  type AssetInput,
  type LiabilityInput,
  type DebtPaymentInput,
} from "@/app/(app)/net-worth/actions";
import { convertToBase } from "@/lib/finance/currencies";
import {
  monthlyPayment,
  projectPayoff,
  payoffDateLabel,
} from "@/lib/finance/amortization";
import { Amount } from "@/components/ui/Amount";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { DrawUnderline } from "@/components/svg/DrawUnderline";
import { BalanceBeam } from "@/components/svg/BalanceBeam";
import { AssetForm } from "./AssetForm";
import { LiabilityForm } from "./LiabilityForm";
import { LoanSchedule } from "./LoanSchedule";
import { PaymentForm } from "./PaymentForm";
import { PaymentHistory } from "./PaymentHistory";

type AccountRef = { id: string; name: string; currency: string };

type Props = {
  assets: Asset[];
  liabilities: Liability[];
  linkedDebt: Record<string, number>;
  payments: DebtPayment[];
  accounts: AccountRef[];
  base: string;
  rateMap: Record<string, number>;
  cashTotal: number;
  investmentsTotal: number;
  canWrite: boolean;
};

type AssetAction =
  | { type: "add"; row: Asset }
  | { type: "update"; row: Asset }
  | { type: "delete"; id: string };

function assetReduce(state: Asset[], action: AssetAction): Asset[] {
  if (action.type === "add") return [action.row, ...state];
  if (action.type === "update")
    return state.map((r) => (r.id === action.row.id ? action.row : r));
  return state.filter((r) => r.id !== action.id);
}

type LiabilityAction =
  | { type: "add"; row: Liability }
  | { type: "update"; row: Liability }
  | { type: "delete"; id: string };

function liabilityReduce(state: Liability[], action: LiabilityAction): Liability[] {
  if (action.type === "add") return [action.row, ...state];
  if (action.type === "update")
    return state.map((r) => (r.id === action.row.id ? action.row : r));
  return state.filter((r) => r.id !== action.id);
}

type PaymentAction =
  | { type: "add"; row: DebtPayment }
  | { type: "delete"; id: string };

function paymentReduce(state: DebtPayment[], action: PaymentAction): DebtPayment[] {
  if (action.type === "add") return [action.row, ...state];
  return state.filter((r) => r.id !== action.id);
}

function numeric(value: number | string): number {
  return Number(String(value).replace(/[\s,]/g, ""));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.18em] text-text-faint">{children}</p>
  );
}

// The effective payment for a loan: the entered figure, or the level payment its
// principal/rate/term imply. Null when the loan is not amortizing.
function loanPayment(l: Liability): number | null {
  if (l.payment_amount != null) return Number(l.payment_amount);
  if (l.interest_rate != null && l.term_months != null) {
    return monthlyPayment(
      Number(l.original_principal ?? l.balance),
      Number(l.interest_rate),
      Number(l.term_months),
    );
  }
  return null;
}

export function NetWorthView({
  assets,
  liabilities,
  linkedDebt,
  payments,
  accounts,
  base,
  rateMap,
  cashTotal,
  investmentsTotal,
  canWrite,
}: Props) {
  const [optAssets, applyAsset] = useOptimistic(assets, assetReduce);
  const [optLiabilities, applyLiability] = useOptimistic(liabilities, liabilityReduce);
  const [optPayments, applyPayment] = useOptimistic(payments, paymentReduce);
  const [pending, start] = useTransition();
  const [assetOpen, setAssetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [liabilityOpen, setLiabilityOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [payingLiability, setPayingLiability] = useState<Liability | null>(null);
  const { toast } = useToast();

  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const paymentsByLiability = new Map<string, DebtPayment[]>();
  for (const p of optPayments) {
    const list = paymentsByLiability.get(p.liability_id);
    if (list) list.push(p);
    else paymentsByLiability.set(p.liability_id, [p]);
  }

  const assetRefs = optAssets.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
  }));

  const toBase = (amount: number, currency: string) =>
    convertToBase(amount, currency, base, rateMap) ?? 0;

  const tangibleTotal = optAssets.reduce(
    (sum, a) => sum + toBase(Number(a.value), a.currency),
    0,
  );
  const payables = optLiabilities.filter((l) => l.direction === "owed_by_me");
  const receivables = optLiabilities.filter((l) => l.direction === "owed_to_me");
  const payableTotal = payables.reduce(
    (sum, l) => sum + toBase(Number(l.balance), l.currency),
    0,
  );
  const receivableTotal = receivables.reduce(
    (sum, l) => sum + toBase(Number(l.balance), l.currency),
    0,
  );

  const assetsTotal = cashTotal + investmentsTotal + tangibleTotal + receivableTotal;
  const netWorth = assetsTotal - payableTotal;

  function submitAsset(input: AssetInput) {
    const target = editingAsset;
    setAssetOpen(false);
    setEditingAsset(null);
    const shaped = {
      name: input.name,
      asset_type: input.asset_type,
      value: numeric(input.value),
      currency: input.currency,
      purchase_price:
        input.purchase_price == null || input.purchase_price === ""
          ? null
          : numeric(input.purchase_price),
      purchase_date: input.purchase_date || null,
      notes: input.notes ?? null,
    };
    start(async () => {
      if (target) {
        applyAsset({ type: "update", row: { ...target, ...shaped } });
        const res = await updateAsset(target.id, input);
        if (!res.ok) toast(res.error, "error");
      } else {
        applyAsset({
          type: "add",
          row: {
            id: `temp-${Date.now()}`,
            user_id: "",
            created_at: new Date().toISOString(),
            ...shaped,
          },
        });
        const res = await createAsset(input);
        if (!res.ok) toast(res.error, "error");
      }
    });
  }

  function removeAsset(row: Asset) {
    start(async () => {
      applyAsset({ type: "delete", id: row.id });
      const res = await deleteAsset(row.id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  function submitLiability(input: LiabilityInput) {
    const target = editingLiability;
    setLiabilityOpen(false);
    setEditingLiability(null);
    const shaped = {
      name: input.name,
      liability_type: input.liability_type,
      direction: input.direction,
      balance: numeric(input.balance),
      currency: input.currency,
      original_principal:
        input.original_principal == null || input.original_principal === ""
          ? null
          : numeric(input.original_principal),
      interest_rate:
        input.interest_rate == null || input.interest_rate === ""
          ? null
          : numeric(input.interest_rate),
      term_months:
        input.term_months == null || input.term_months === ""
          ? null
          : Math.round(numeric(input.term_months)),
      payment_amount:
        input.payment_amount == null || input.payment_amount === ""
          ? null
          : numeric(input.payment_amount),
      start_date: input.start_date || null,
      asset_id: input.asset_id || null,
      notes: input.notes ?? null,
    };
    start(async () => {
      if (target) {
        applyLiability({ type: "update", row: { ...target, ...shaped } });
        const res = await updateLiability(target.id, input);
        if (!res.ok) toast(res.error, "error");
      } else {
        applyLiability({
          type: "add",
          row: {
            id: `temp-${Date.now()}`,
            user_id: "",
            created_at: new Date().toISOString(),
            ...shaped,
          },
        });
        const res = await createLiability(input);
        if (!res.ok) toast(res.error, "error");
      }
    });
  }

  function removeLiability(row: Liability) {
    start(async () => {
      applyLiability({ type: "delete", id: row.id });
      const res = await deleteLiability(row.id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  function submitPayment(input: DebtPaymentInput) {
    const debt = payingLiability;
    setPayingLiability(null);
    if (!debt) return;
    const amount = numeric(input.amount);
    const interest =
      input.interest_amount == null || input.interest_amount === ""
        ? 0
        : numeric(input.interest_amount);
    const principal =
      input.principal_amount == null || input.principal_amount === ""
        ? amount
        : numeric(input.principal_amount);
    start(async () => {
      // The principal pays the debt down right away; cash settles on revalidate.
      applyLiability({
        type: "update",
        row: { ...debt, balance: Number(debt.balance) - principal },
      });
      applyPayment({
        type: "add",
        row: {
          id: `temp-${Date.now()}`,
          user_id: "",
          liability_id: debt.id,
          account_id: input.account_id ?? null,
          amount,
          principal_amount: principal,
          interest_amount: interest,
          account_amount:
            input.account_amount == null || input.account_amount === ""
              ? null
              : numeric(input.account_amount),
          currency: debt.currency,
          paid_on: input.paid_on || new Date().toISOString().slice(0, 10),
          note: input.note ?? null,
          created_at: new Date().toISOString(),
        },
      });
      const res = await recordDebtPayment(input);
      if (!res.ok) toast(res.error, "error");
    });
  }

  function removePayment(row: DebtPayment) {
    const debt = optLiabilities.find((l) => l.id === row.liability_id);
    start(async () => {
      applyPayment({ type: "delete", id: row.id });
      if (debt) {
        applyLiability({
          type: "update",
          row: { ...debt, balance: Number(debt.balance) + Number(row.principal_amount) },
        });
      }
      const res = await deleteDebtPayment(row.id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  const rowActions = (onEdit: () => void, onRemove: () => void, isTemp: boolean) =>
    canWrite && !isTemp ? (
      <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-text"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-neg"
        >
          Remove
        </button>
      </div>
    ) : null;

  return (
    <PageTransition>
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>Net worth</SectionLabel>
          <p className="mt-3 font-serif text-4xl tracking-tight text-text">
            <Amount value={netWorth} currency={base} quiet code />
          </p>
          <DrawUnderline width={160} className="mt-1 text-brass" />
          <p className="mt-2 text-xs text-text-muted">
            Assets <Amount value={assetsTotal} currency={base} tone="plain" className="text-text-muted" />
            {" · "}
            Liabilities <Amount value={payableTotal} currency={base} tone="plain" className="text-text-muted" />
          </p>
        </div>
        <BalanceBeam
          tilt={netWorth >= 0 ? 1 : -1}
          size={132}
          className="hidden shrink-0 text-brass/80 sm:block"
        />
      </div>

      {/* Assets */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <SectionLabel>Assets</SectionLabel>
          <span className="text-sm text-text-muted">
            <Amount value={assetsTotal} currency={base} tone="pos" quiet />
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Cross-screen summary rows */}
          {cashTotal !== 0 ? (
            <Link href="/accounts">
              <Card interactive className="flex h-full items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm text-text">Cash & accounts</p>
                  <p className="mt-0.5 text-xs text-text-faint">From Accounts →</p>
                </div>
                <Amount value={cashTotal} currency={base} quiet />
              </Card>
            </Link>
          ) : null}
          {investmentsTotal !== 0 ? (
            <Link href="/investments">
              <Card interactive className="flex h-full items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm text-text">Investments</p>
                  <p className="mt-0.5 text-xs text-text-faint">From Investments →</p>
                </div>
                <Amount value={investmentsTotal} currency={base} quiet />
              </Card>
            </Link>
          ) : null}

          {optAssets.map((asset) => {
            const isTemp = asset.id.startsWith("temp-");
            const debt = linkedDebt[asset.id] ?? 0;
            const equity = Number(asset.value) - debt;
            return (
              <motion.div
                key={asset.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: isTemp ? 0.6 : 1, y: 0 }}
              >
                <Card className="group flex h-full flex-col px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">{asset.name}</p>
                      <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-text-faint">
                        {ASSET_TYPE_LABELS[asset.asset_type]}
                      </p>
                    </div>
                    <Amount value={Number(asset.value)} currency={asset.currency} quiet code />
                  </div>
                  {debt !== 0 ? (
                    <p className="mt-2 text-xs text-text-faint">
                      Equity{" "}
                      <Amount
                        value={equity}
                        currency={asset.currency}
                        tone={equity >= 0 ? "pos" : "neg"}
                      />{" "}
                      after <Amount value={debt} currency={asset.currency} tone="muted" /> owed
                    </p>
                  ) : null}
                  {canWrite && !isTemp ? (
                    <div className="mt-3 flex border-t border-border pt-2">
                      {rowActions(
                        () => {
                          setEditingAsset(asset);
                          setAssetOpen(true);
                        },
                        () => removeAsset(asset),
                        isTemp,
                      )}
                    </div>
                  ) : null}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Money owed to you */}
        {receivables.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-text-faint">
              Owed to you
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {receivables.map((l) => {
                const isTemp = l.id.startsWith("temp-");
                return (
                  <motion.div key={l.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: isTemp ? 0.6 : 1, y: 0 }}>
                    <Card className="group flex h-full flex-col px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm text-text">{l.name}</p>
                        <Amount value={Number(l.balance)} currency={l.currency} tone="pos" quiet code />
                      </div>

                      <PaymentHistory
                        payments={paymentsByLiability.get(l.id) ?? []}
                        currency={l.currency}
                        accountNames={accountNames}
                        canWrite={canWrite}
                        onRemove={removePayment}
                      />

                      {canWrite && !isTemp ? (
                        <div className="mt-3 flex items-center border-t border-border pt-2">
                          <button
                            type="button"
                            onClick={() => setPayingLiability(l)}
                            className="rounded-sm px-2 py-1 text-xs text-pos transition hover:bg-surface-hover"
                          >
                            Record receipt
                          </button>
                          {rowActions(
                            () => {
                              setEditingLiability(l);
                              setLiabilityOpen(true);
                            },
                            () => removeLiability(l),
                            isTemp,
                          )}
                        </div>
                      ) : null}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : null}

        {canWrite ? (
          <button
            type="button"
            onClick={() => {
              setEditingAsset(null);
              setAssetOpen(true);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border px-4 py-3 text-sm text-text-muted transition hover:border-border-strong hover:text-text"
          >
            + Add asset
          </button>
        ) : null}
      </div>

      {/* Liabilities */}
      <div className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <SectionLabel>Liabilities</SectionLabel>
          <span className="text-sm text-text-muted">
            <Amount value={payableTotal} currency={base} tone="neg" quiet />
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {payables.map((l) => {
            const isTemp = l.id.startsWith("temp-");
            const payment = loanPayment(l);
            const rate = l.interest_rate != null ? Number(l.interest_rate) : null;
            const securedAsset = l.asset_id
              ? optAssets.find((a) => a.id === l.asset_id)
              : null;
            const projection =
              rate != null && payment != null && payment > 0
                ? projectPayoff(Number(l.balance), rate, payment)
                : null;
            return (
              <motion.div
                key={l.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: isTemp ? 0.6 : 1, y: 0 }}
              >
                <Card className="group flex h-full flex-col px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">{l.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-text-faint">
                        <span className="uppercase tracking-[0.14em]">
                          {LIABILITY_TYPE_LABELS[l.liability_type]}
                        </span>
                        {securedAsset ? (
                          <Badge tone="neutral">on {securedAsset.name}</Badge>
                        ) : null}
                      </p>
                    </div>
                    <Amount value={Number(l.balance)} currency={l.currency} tone="neg" quiet code />
                  </div>

                  {rate != null || payment != null ? (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                      {rate != null ? <span>{rate}% APR</span> : null}
                      {payment != null ? (
                        <span>
                          <Amount value={payment} currency={l.currency} tone="muted" />/mo
                        </span>
                      ) : null}
                      {projection?.feasible ? (
                        <>
                          <span>Payoff {payoffDateLabel(projection.months)}</span>
                          <span>
                            Interest{" "}
                            <Amount value={projection.totalInterest} currency={l.currency} tone="muted" />
                          </span>
                        </>
                      ) : projection && !projection.feasible ? (
                        <span className="text-neg">Payment doesn&apos;t cover interest</span>
                      ) : null}
                    </div>
                  ) : null}

                  {rate != null && payment != null && payment > 0 ? (
                    <LoanSchedule
                      balance={Number(l.balance)}
                      aprPct={rate}
                      payment={payment}
                      currency={l.currency}
                    />
                  ) : null}

                  <PaymentHistory
                    payments={paymentsByLiability.get(l.id) ?? []}
                    currency={l.currency}
                    accountNames={accountNames}
                    canWrite={canWrite}
                    onRemove={removePayment}
                  />

                  {canWrite && !isTemp ? (
                    <div className="mt-3 flex items-center border-t border-border pt-2">
                      <button
                        type="button"
                        onClick={() => setPayingLiability(l)}
                        className="rounded-sm px-2 py-1 text-xs text-red-bright transition hover:bg-surface-hover"
                      >
                        Record payment
                      </button>
                      {rowActions(
                        () => {
                          setEditingLiability(l);
                          setLiabilityOpen(true);
                        },
                        () => removeLiability(l),
                        isTemp,
                      )}
                    </div>
                  ) : null}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {canWrite ? (
          <button
            type="button"
            onClick={() => {
              setEditingLiability(null);
              setLiabilityOpen(true);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border px-4 py-3 text-sm text-text-muted transition hover:border-border-strong hover:text-text"
          >
            + Add debt
          </button>
        ) : null}
      </div>

      <Modal
        open={assetOpen}
        onClose={() => {
          setAssetOpen(false);
          setEditingAsset(null);
        }}
        title={editingAsset ? "Edit asset" : "Add asset"}
      >
        <AssetForm
          initial={editingAsset ?? undefined}
          base={base}
          pending={pending}
          onSubmit={submitAsset}
          onCancel={() => {
            setAssetOpen(false);
            setEditingAsset(null);
          }}
        />
      </Modal>

      <Modal
        open={liabilityOpen}
        onClose={() => {
          setLiabilityOpen(false);
          setEditingLiability(null);
        }}
        title={editingLiability ? "Edit debt" : "Add debt"}
        size="lg"
      >
        <LiabilityForm
          initial={editingLiability ?? undefined}
          base={base}
          assets={assetRefs}
          pending={pending}
          onSubmit={submitLiability}
          onCancel={() => {
            setLiabilityOpen(false);
            setEditingLiability(null);
          }}
        />
      </Modal>

      <Modal
        open={payingLiability !== null}
        onClose={() => setPayingLiability(null)}
        title={
          payingLiability?.direction === "owed_to_me"
            ? `Record receipt — ${payingLiability?.name}`
            : `Record payment — ${payingLiability?.name ?? ""}`
        }
      >
        {payingLiability ? (
          <PaymentForm
            liability={payingLiability}
            accounts={accounts}
            base={base}
            rateMap={rateMap}
            pending={pending}
            onSubmit={submitPayment}
            onCancel={() => setPayingLiability(null)}
          />
        ) : null}
      </Modal>
    </PageTransition>
  );
}
