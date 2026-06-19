"use client";

import { motion, useReducedMotion } from "motion/react";
import { Amount } from "@/components/ui/Amount";

// Recurring monthly income against recurring monthly spend, as two paired bars
// scaled to the larger of the two, with the leftover surfaced as the net.
export function CashflowStrip({
  income,
  expense,
  currency,
}: {
  income: number;
  expense: number;
  currency: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(income, expense, 1);
  const net = income - expense;

  const rows = [
    { label: "Income", value: income, pct: (income / max) * 100, color: "var(--pos)" },
    { label: "Spend", value: expense, pct: (expense / max) * 100, color: "var(--red-bright)" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">{row.label}</span>
              <span className="tabular-nums text-text">
                <Amount value={row.value} currency={currency} quiet />
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: row.color }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${row.pct}%` }}
                transition={{ duration: 0.8, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="uppercase tracking-[0.14em] text-text-faint">
          Net monthly
        </span>
        <span className="text-sm">
          <Amount
            value={net}
            currency={currency}
            signed
            tone={net >= 0 ? "pos" : "neg"}
            quiet
          />
        </span>
      </div>
    </div>
  );
}
