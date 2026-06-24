"use client";

import { motion } from "motion/react";
import type { Investment } from "@/types";
import {
  positionValue,
  gainLoss,
  gainLossPct,
} from "@/lib/finance/calculations";
import { convertToBase } from "@/lib/finance/currencies";
import { CountUp } from "@/components/ui/CountUp";
import { Amount } from "@/components/ui/Amount";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/finance/format";

export function PositionCard({
  investment,
  base,
  rateMap,
  offline,
  adjusted,
  accountName,
  onOpen,
}: {
  investment: Investment;
  base: string;
  rateMap: Record<string, number>;
  offline: boolean;
  adjusted: boolean;
  // The account this position is mirrored into, when linked.
  accountName?: string;
  onOpen: () => void;
}) {
  const value = positionValue(investment.shares, investment.current_price);
  const valueBase = convertToBase(value, investment.currency, base, rateMap);
  const gl = gainLoss(
    investment.shares,
    investment.current_price,
    investment.purchase_price,
  );
  const glBase = convertToBase(gl, investment.currency, base, rateMap);
  const glPct = gainLossPct(investment.current_price, investment.purchase_price);

  const badge = investment.price_is_manual
    ? { tone: "manual" as const, label: "Manual" }
    : !investment.is_live_priced
      ? { tone: "neutral" as const, label: "Held" }
      : offline
        ? { tone: "offline" as const, label: "Offline" }
        : { tone: "live" as const, label: "Live" };

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-left"
    >
      <Card interactive className="h-full px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-text">
              {investment.name ?? investment.ticker}
            </p>
            {investment.ticker ? (
              <p className="mt-0.5 font-mono text-xs text-text-faint">
                {investment.ticker}
              </p>
            ) : null}
            {accountName ? (
              <p className="mt-0.5 truncate text-xs text-brass/80">
                In {accountName}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            {adjusted ? <Badge tone="manual">Adjusted</Badge> : null}
          </div>
        </div>

        <p className="mt-4 font-serif text-2xl tracking-tight text-text">
          {valueBase != null ? (
            <CountUp value={valueBase} currency={base} quiet />
          ) : (
            <Amount value={value} currency={investment.currency} quiet />
          )}
        </p>

        <div className="mt-1 flex items-center gap-2 text-xs">
          {glBase != null ? (
            <Amount
              value={glBase}
              currency={base}
              signed
              tone={glBase >= 0 ? "pos" : "neg"}
            />
          ) : null}
          {glPct != null ? (
            <span className={glPct >= 0 ? "text-pos" : "text-neg"}>
              {formatPercent(glPct, { signed: true })}
            </span>
          ) : null}
        </div>
      </Card>
    </motion.button>
  );
}
