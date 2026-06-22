"use client";

import { useState } from "react";
import type { Saving } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { WaxSeal } from "@/components/svg/WaxSeal";
import { formatCurrency } from "@/lib/finance/format";

function numeric(value: string): number {
  return Number(value.replace(/[\s,]/g, ""));
}

// Set actual balance. The difference against the tracked balance previews live
// before anything saves, then the wax seal confirms it. The gap posts as a real
// income or expense against the account, not a silent overwrite, so the change
// shows up in cashflow and the account log like any other movement.
export function ReconcileDialog({
  saving,
  open,
  pending,
  onClose,
  onConfirm,
}: {
  saving: Saving | null;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (actual: string, note: string) => void;
}) {
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");

  if (!saving) return null;

  const tracked = Number(saving.balance);
  const entered = actual.trim() === "" ? null : numeric(actual);
  const valid = entered != null && !Number.isNaN(entered);
  const diff = valid ? entered - tracked : 0;
  const isGain = diff > 0;

  function reset() {
    setActual("");
    setNote("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function confirm() {
    if (!valid || diff === 0) return;
    onConfirm(actual, note);
    reset();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Set actual balance">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-4 py-3">
          <span className="text-xs uppercase tracking-[0.18em] text-text-muted">
            {saving.account_name}
          </span>
          <span className="text-sm text-text-muted">
            tracked{" "}
            <Amount
              value={tracked}
              currency={saving.currency}
              tone="plain"
              className="text-text"
            />
          </span>
        </div>

        <Input
          id="actual"
          label="True balance now"
          inputMode="decimal"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          autoFocus
        />

        {valid && diff !== 0 ? (
          <p className="text-sm text-text-muted">
            Posts a{" "}
            <Amount
              value={Math.abs(diff)}
              currency={saving.currency}
              tone={isGain ? "pos" : "neg"}
            />{" "}
            {isGain ? "income" : "expense"} to match.
          </p>
        ) : valid && diff === 0 ? (
          <p className="text-sm text-text-faint">
            That matches the tracked balance. Nothing to book.
          </p>
        ) : null}

        <Textarea
          id="reconcile-note"
          label="Note"
          placeholder="Optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="mt-1 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={confirm}
            disabled={!valid || diff === 0 || pending}
            aria-label={
              valid && diff !== 0
                ? `Confirm, posts ${formatCurrency(Math.abs(diff), saving.currency)} ${isGain ? "income" : "expense"}`
                : "Confirm"
            }
            className="flex items-center gap-2 rounded-sm bg-red px-3 py-2 text-sm text-text transition hover:bg-red-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            <WaxSeal size={26} />
            Stamp and set
          </button>
        </div>
      </div>
    </Modal>
  );
}
