"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type {
  AccountRef,
  Category,
  CategoryKind,
  RecurringRule,
} from "@/types";
import { RECURRENCE_LABELS } from "@/types";
import {
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  type RuleInput,
} from "@/app/(app)/recurring/actions";
import { recurrenceMonthly } from "@/lib/finance/calculations";
import { convertToBase } from "@/lib/finance/currencies";
import { Amount } from "@/components/ui/Amount";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { RuleForm } from "./RuleForm";

type Optimistic =
  | { type: "add"; row: RecurringRule }
  | { type: "update"; row: RecurringRule }
  | { type: "toggle"; id: string; active: boolean }
  | { type: "delete"; id: string };

function reduce(state: RecurringRule[], action: Optimistic): RecurringRule[] {
  if (action.type === "add") return [action.row, ...state];
  if (action.type === "update")
    return state.map((r) => (r.id === action.row.id ? action.row : r));
  if (action.type === "toggle")
    return state.map((r) =>
      r.id === action.id ? { ...r, active: action.active } : r,
    );
  return state.filter((r) => r.id !== action.id);
}

function numeric(value: number | string): number {
  return Number(String(value).replace(/[\s,]/g, ""));
}

// The recurring rules for one screen (income or expense): a collapsed summary
// that opens to a managed list. Self-contained — owns its own optimistic state
// and talks to the rule actions directly.
export function RecurringRulesPanel({
  rules,
  kind,
  base,
  rateMap,
  accounts,
  categories,
  defaultAccountId,
  canWrite,
}: {
  rules: RecurringRule[];
  kind: CategoryKind;
  base: string;
  rateMap: Record<string, number>;
  accounts: AccountRef[];
  categories: Category[];
  defaultAccountId: string | null;
  canWrite: boolean;
}) {
  const [optimistic, apply] = useOptimistic(rules, reduce);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const { toast } = useToast();

  const noun = kind === "income" ? "income" : "expenses";

  // Combined monthly equivalent of the active rules, in base currency.
  let monthlyTotal = 0;
  for (const r of optimistic) {
    if (!r.active) continue;
    const v = convertToBase(
      recurrenceMonthly(Number(r.amount), r.cadence),
      r.currency,
      base,
      rateMap,
    );
    if (v != null) monthlyTotal += v;
  }

  function submit(input: RuleInput) {
    const target = editing;
    setFormOpen(false);
    setEditing(null);
    start(async () => {
      if (target) {
        apply({
          type: "update",
          row: {
            ...target,
            label: input.label,
            amount: numeric(input.amount),
            currency: input.currency,
            account_id: input.account_id ?? null,
            category_id: input.category_id ?? null,
            cadence: input.cadence,
            notes: input.notes ?? null,
          },
        });
        const res = await updateRule(target.id, input);
        if (!res.ok) toast(res.error, "error");
      } else {
        apply({
          type: "add",
          row: {
            id: `temp-${Date.now()}`,
            user_id: "",
            kind,
            label: input.label,
            amount: numeric(input.amount),
            currency: input.currency,
            account_id: input.account_id ?? null,
            category_id: input.category_id ?? null,
            cadence: input.cadence,
            anchor_date: input.anchor_date,
            next_run: input.anchor_date,
            active: true,
            notes: input.notes ?? null,
            created_at: new Date().toISOString(),
          },
        });
        const res = await createRule(input);
        if (res.ok) toast("Recurring added.", "success");
        else toast(res.error, "error");
      }
    });
  }

  function setActive(rule: RecurringRule, active: boolean) {
    start(async () => {
      apply({ type: "toggle", id: rule.id, active });
      const res = await toggleRule(rule.id, active);
      if (!res.ok) toast(res.error, "error");
    });
  }

  function remove(rule: RecurringRule) {
    start(async () => {
      apply({ type: "delete", id: rule.id });
      const res = await deleteRule(rule.id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <>
      {optimistic.length === 0 ? (
        canWrite ? (
          <button
            type="button"
            onClick={openAdd}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border px-4 py-3 text-sm text-text-muted transition hover:border-border-strong hover:text-text"
          >
            + Add recurring {noun}
          </button>
        ) : null
      ) : (
        <div className="mt-6 overflow-hidden rounded-sm border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex flex-1 items-center gap-2.5 text-left"
            >
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
              <span className="text-sm text-text">Recurring {noun}</span>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
                {optimistic.length}
              </span>
              <span className="ml-2 text-xs text-text-muted">
                <Amount value={monthlyTotal} currency={base} tone="muted" />
                {" / mo"}
              </span>
            </button>
            {canWrite ? (
              <Button size="sm" variant="outline" onClick={openAdd}>
                Add
              </Button>
            ) : null}
          </div>

          <AnimatePresence initial={false}>
            {open ? (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="divide-y divide-border border-t border-border"
              >
                {optimistic.map((rule) => {
                  const isTemp = rule.id.startsWith("temp-");
                  return (
                    <li
                      key={rule.id}
                      className="group flex items-center justify-between gap-4 px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm ${rule.active ? "text-text" : "text-text-faint line-through"}`}
                        >
                          {rule.label}
                        </p>
                        <p className="text-xs text-text-faint">
                          {RECURRENCE_LABELS[rule.cadence]}
                          {rule.active ? ` · next ${rule.next_run}` : " · paused"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Amount
                          value={Number(rule.amount)}
                          currency={rule.currency}
                          className="text-sm"
                        />
                        {canWrite && !isTemp ? (
                          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setActive(rule, !rule.active)}
                              className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-text"
                            >
                              {rule.active ? "Pause" : "Resume"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(rule);
                                setFormOpen(true);
                              }}
                              className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-text"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(rule)}
                              className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-neg"
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={
          editing
            ? "Edit recurring"
            : `Add recurring ${kind === "income" ? "income" : "expense"}`
        }
      >
        <RuleForm
          initial={editing ?? undefined}
          kind={kind}
          base={base}
          accounts={accounts}
          categories={categories}
          defaultAccountId={defaultAccountId}
          pending={pending}
          onSubmit={submit}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </Modal>
    </>
  );
}
