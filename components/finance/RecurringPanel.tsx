"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Amount } from "@/components/ui/Amount";

export type RecurringItem = {
  id: string;
  label: string;
  // Human cadence, e.g. "Monthly", "Weekly".
  cadence: string;
  // The entry's own amount and currency, as logged.
  amount: number;
  currency: string;
  // Monthly equivalent in the base currency, or null when it could not convert.
  monthly: number | null;
};

// A collapsed summary of the recurring entries on a screen that expands to the
// full list on click. Closed by default so it never crowds the page; the header
// carries the count and the combined monthly figure so it is useful even shut.
export function RecurringPanel({
  items,
  base,
  monthlyTotal,
  noun,
}: {
  items: RecurringItem[];
  base: string;
  // Combined monthly equivalent in base, computed by the caller so the header
  // and the screen's totals never disagree.
  monthlyTotal: number;
  // "income" | "expenses", for the label.
  noun: string;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-sm border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-hover"
      >
        <span className="flex items-center gap-2.5">
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-muted"
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path d="M9 6l6 6-6 6" />
          </motion.svg>
          <span className="text-sm text-text">
            Recurring {noun}
          </span>
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
            {items.length}
          </span>
        </span>
        <span className="shrink-0 text-xs text-text-muted">
          <Amount value={monthlyTotal} currency={base} tone="muted" />
          {" / mo"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="divide-y divide-border border-t border-border"
          >
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{item.label}</p>
                  <p className="text-xs text-text-faint">{item.cadence}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Amount
                    value={item.amount}
                    currency={item.currency}
                    className="text-sm"
                  />
                  {item.monthly != null ? (
                    <p className="mt-0.5 text-xs text-text-faint">
                      <Amount value={item.monthly} currency={base} tone="muted" />
                      {" / mo"}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
