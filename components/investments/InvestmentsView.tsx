"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Investment } from "@/types";
import { LIVE_INVESTMENT_TYPES } from "@/types";
import {
  createInvestment,
  updateInvestment,
  deleteInvestment,
  refreshPrices,
  type InvestmentInput,
} from "@/app/(app)/investments/actions";
import { positionValue } from "@/lib/finance/calculations";
import { convertToBase } from "@/lib/finance/currencies";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { RefreshIcon } from "@/components/svg/icons";
import { PageTransition } from "@/components/layout/PageTransition";
import { EmptyState } from "@/components/finance/EmptyState";
import { InvestmentForm } from "./InvestmentForm";
import { PositionCard } from "./PositionCard";
import { PositionDetail } from "./PositionDetail";

type Props = {
  rows: Investment[];
  adjustedIds: string[];
  base: string;
  rateMap: Record<string, number>;
  canWrite: boolean;
};

type Optimistic =
  | { type: "add"; row: Investment }
  | { type: "update"; row: Investment }
  | { type: "delete"; id: string };

function reduce(state: Investment[], action: Optimistic): Investment[] {
  if (action.type === "add") return [action.row, ...state];
  if (action.type === "update")
    return state.map((r) => (r.id === action.row.id ? action.row : r));
  return state.filter((r) => r.id !== action.id);
}

function numeric(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/[\s,]/g, ""));
  return Number.isNaN(n) ? null : n;
}

export function InvestmentsView({
  rows,
  adjustedIds,
  base,
  rateMap,
  canWrite,
}: Props) {
  const [optimistic, apply] = useOptimistic(rows, reduce);
  const [pending, start] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [offline, setOffline] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const adjusted = new Set(adjustedIds);

  let total = 0;
  let unconverted = 0;
  for (const r of optimistic) {
    const v = convertToBase(
      positionValue(r.shares, r.current_price),
      r.currency,
      base,
      rateMap,
    );
    if (v == null) unconverted += 1;
    else total += v;
  }

  const detail = detailId
    ? optimistic.find((r) => r.id === detailId) ?? null
    : null;
  const hasLive = optimistic.some(
    (r) => r.is_live_priced && !r.price_is_manual,
  );

  function submit(input: InvestmentInput) {
    const target = editing;
    setOpen(false);
    setEditing(null);
    const isLive = LIVE_INVESTMENT_TYPES.includes(input.type);
    const shaped = {
      ticker: isLive ? (input.ticker ?? null) : null,
      name: input.name ?? input.ticker ?? null,
      shares: numeric(input.shares) ?? 0,
      purchase_price: numeric(input.purchase_price),
      current_price: numeric(input.current_price),
      currency: input.currency,
      type: input.type,
      is_live_priced: isLive,
    };
    start(async () => {
      if (target) {
        apply({
          type: "update",
          row: { ...target, ...shaped, price_is_manual: target.price_is_manual },
        });
        const res = await updateInvestment(target.id, input);
        if (!res.ok) toast(res.error, "error");
      } else {
        apply({
          type: "add",
          row: {
            id: `temp-${Date.now()}`,
            user_id: "",
            created_at: new Date().toISOString(),
            price_is_manual: false,
            price_updated_at: null,
            purchase_date: input.purchase_date ?? null,
            notes: input.notes ?? null,
            ...shaped,
          },
        });
        const res = await createInvestment(input);
        if (!res.ok) toast(res.error, "error");
      }
    });
  }

  function remove(row: Investment) {
    setDetailId(null);
    start(async () => {
      apply({ type: "delete", id: row.id });
      const res = await deleteInvestment(row.id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  function refresh() {
    startRefresh(async () => {
      const res = await refreshPrices();
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setOffline(new Set(res.failed));
      toast(
        res.failed.length === 0
          ? "Prices updated."
          : `Updated, ${res.failed.length} could not be priced.`,
        res.failed.length === 0 ? "success" : "default",
      );
    });
  }

  return (
    <PageTransition>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
            Investments
          </p>
          <p className="mt-3 font-serif text-4xl tracking-tight text-text">
            <CountUp value={total} currency={base} quiet />
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Portfolio value
            {unconverted > 0 ? `, plus ${unconverted} in other currencies` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasLive ? (
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              <motion.span
                animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  refreshing
                    ? { duration: 1, repeat: Infinity, ease: "linear" }
                    : { duration: 0 }
                }
                className="inline-flex"
              >
                <RefreshIcon size={16} />
              </motion.span>
              {refreshing ? "Refreshing" : "Refresh"}
            </Button>
          ) : null}
          {canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Add position
            </Button>
          ) : null}
        </div>
      </div>

      {optimistic.length === 0 ? (
        <EmptyState
          title="No positions yet"
          hint="Add a stock, ETF, crypto, or a manual asset to track its value and history."
          action={
            canWrite ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Add position
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {optimistic.map((row) => (
              <PositionCard
                key={row.id}
                investment={row}
                base={base}
                rateMap={rateMap}
                offline={row.ticker ? offline.has(row.ticker) : false}
                adjusted={adjusted.has(row.id)}
                onOpen={() => setDetailId(row.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit position" : "Add position"}
        size="lg"
      >
        <InvestmentForm
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

      <PositionDetail
        investment={detail}
        base={base}
        rateMap={rateMap}
        canWrite={canWrite}
        offline={detail?.ticker ? offline.has(detail.ticker) : false}
        onClose={() => setDetailId(null)}
        onEdit={() => {
          if (!detail) return;
          setDetailId(null);
          setEditing(detail);
          setOpen(true);
        }}
        onRemove={() => detail && remove(detail)}
      />
    </PageTransition>
  );
}
