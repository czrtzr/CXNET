"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { buildSchedule } from "@/lib/finance/amortization";
import { Amount } from "@/components/ui/Amount";

// The row-by-row amortization, revealed on demand. Capped to a readable window
// with a count of the remaining periods so a 30-year loan stays legible.
export function LoanSchedule({
  balance,
  aprPct,
  payment,
  currency,
}: {
  balance: number;
  aprPct: number;
  payment: number;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const rows = buildSchedule(balance, aprPct, payment);
  if (rows.length === 0) return null;

  const shown = rows.slice(0, 12);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs text-text-muted transition hover:text-text"
      >
        {open ? "Hide schedule" : "View schedule"}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <table className="mt-3 w-full text-xs tabular-nums">
              <thead>
                <tr className="text-left text-text-faint">
                  <th className="py-1 font-normal">#</th>
                  <th className="py-1 text-right font-normal">Interest</th>
                  <th className="py-1 text-right font-normal">Principal</th>
                  <th className="py-1 text-right font-normal">Balance</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.period} className="border-t border-border/60 text-text-muted">
                    <td className="py-1">{r.period}</td>
                    <td className="py-1 text-right">
                      <Amount value={r.interest} currency={currency} tone="muted" quiet={false} />
                    </td>
                    <td className="py-1 text-right">
                      <Amount value={r.principal} currency={currency} tone="muted" quiet={false} />
                    </td>
                    <td className="py-1 text-right text-text">
                      <Amount value={r.balance} currency={currency} quiet={false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > shown.length ? (
              <p className="mt-2 text-xs text-text-faint">
                +{rows.length - shown.length} more payments to payoff
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
