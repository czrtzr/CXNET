"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { DebtPayment } from "@/types";
import { Amount } from "@/components/ui/Amount";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Format a YYYY-MM-DD string without going through Date (which would parse it as
// UTC midnight and shift the day backward in western timezones).
function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// The recorded payments against one debt, revealed on demand with a running
// total. Each row shows the split and which account it moved, and can be undone.
export function PaymentHistory({
  payments,
  currency,
  accountNames,
  canWrite,
  onRemove,
}: {
  payments: DebtPayment[];
  currency: string;
  accountNames: Map<string, string>;
  canWrite: boolean;
  onRemove: (payment: DebtPayment) => void;
}) {
  const [open, setOpen] = useState(false);
  if (payments.length === 0) return null;

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs text-text-muted transition hover:text-text"
      >
        {open ? "Hide payments" : `${payments.length} payment${payments.length > 1 ? "s" : ""}`}
        {" · "}
        <Amount value={total} currency={currency} tone="muted" />
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
            <ul className="mt-3 flex flex-col gap-2 text-xs">
              {payments.map((p) => {
                const isTemp = p.id.startsWith("temp-");
                const account = p.account_id ? accountNames.get(p.account_id) : null;
                const interest = Number(p.interest_amount);
                return (
                  <li
                    key={p.id}
                    className="group/payment flex items-start justify-between gap-3 border-t border-border/60 pt-2"
                  >
                    <div className="min-w-0">
                      <p className="text-text-muted">
                        {dateLabel(p.paid_on)}
                        {account ? <span className="text-text-faint"> · {account}</span> : null}
                      </p>
                      <p className="mt-0.5 text-text-faint">
                        <Amount value={Number(p.principal_amount)} currency={currency} tone="muted" /> principal
                        {interest > 0 ? (
                          <>
                            {" · "}
                            <Amount value={interest} currency={currency} tone="muted" /> interest
                          </>
                        ) : null}
                      </p>
                      {p.note ? <p className="mt-0.5 text-text-faint">{p.note}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Amount value={Number(p.amount)} currency={currency} tone="plain" className="text-text" />
                      {canWrite && !isTemp ? (
                        <button
                          type="button"
                          onClick={() => onRemove(p)}
                          className="rounded-sm px-1.5 py-0.5 text-text-faint opacity-0 transition hover:text-neg group-hover/payment:opacity-100"
                          aria-label="Remove payment"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
