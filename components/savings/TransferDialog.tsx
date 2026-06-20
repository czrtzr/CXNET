"use client";

import { useMemo, useState } from "react";
import type { AccountRef } from "@/types";
import type { TransferInput } from "@/app/(app)/accounts/actions";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SelectMenu } from "@/components/ui/SelectMenu";

function numeric(value: string): number {
  return Number(value.replace(/[\s,]/g, ""));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Move money between two accounts. Same-currency moves carry one figure; when the
// accounts differ in currency, the amount received is pre-filled at today's rate
// (from the page's rate map) and stays editable, so the real received figure is
// recorded rather than an estimate.
export function TransferDialog({
  open,
  accounts,
  rateMap,
  pending,
  presetFrom,
  onClose,
  onConfirm,
}: {
  open: boolean;
  accounts: AccountRef[];
  rateMap: Record<string, number>;
  pending: boolean;
  // When opened from a specific account card, pre-select it as the source.
  presetFrom?: string;
  onClose: () => void;
  onConfirm: (input: TransferInput) => void;
}) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [toTouched, setToTouched] = useState(false);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());

  // Seed the source from the card that launched the dialog, once per open.
  // Adjusting state during render (the sanctioned alternative to a setState
  // effect) keeps the preselection in lock-step with opening, with no extra
  // render pass. `seeded` resets on close so the next open re-seeds.
  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setSeeded(true);
    setFromId(presetFrom ?? "");
    setToId("");
  } else if (!open && seeded) {
    setSeeded(false);
  }

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);
  const cross =
    !!fromAccount && !!toAccount && fromAccount.currency !== toAccount.currency;

  const suggestion = useMemo(() => {
    if (!cross || !fromAccount || !toAccount) return "";
    const f = numeric(fromAmount);
    const rf = rateMap[fromAccount.currency];
    const rt = rateMap[toAccount.currency];
    if (!f || !rf || !rt) return "";
    return ((f * rf) / rt).toFixed(2);
  }, [cross, fromAmount, fromAccount, toAccount, rateMap]);

  const effectiveTo = cross ? (toTouched ? toAmount : suggestion) : fromAmount;

  const valid =
    !!fromId &&
    !!toId &&
    fromId !== toId &&
    numeric(fromAmount) > 0 &&
    (!cross || numeric(effectiveTo) > 0);

  function reset() {
    setFromId("");
    setToId("");
    setFromAmount("");
    setToAmount("");
    setToTouched(false);
    setNote("");
    setDate(today());
  }

  function handleClose() {
    reset();
    onClose();
  }

  function confirm() {
    if (!valid) return;
    onConfirm({
      from_account: fromId,
      to_account: toId,
      from_amount: fromAmount,
      to_amount: cross ? effectiveTo : fromAmount,
      note,
      occurred_at: date,
    });
    reset();
  }

  const fromOptions = accounts.map((a) => ({
    value: a.id,
    label: a.account_name,
    hint: a.currency,
  }));
  const toOptions = accounts
    .filter((a) => a.id !== fromId)
    .map((a) => ({ value: a.id, label: a.account_name, hint: a.currency }));

  return (
    <Modal open={open} onClose={handleClose} title="Transfer between accounts">
      <div className="flex flex-col gap-4">
        <SelectMenu
          id="transfer-from"
          label="From"
          value={fromId}
          options={fromOptions}
          placeholder="Source account"
          onChange={(v) => {
            setFromId(v);
            if (v === toId) setToId("");
          }}
        />

        <Input
          id="transfer-amount"
          label={
            fromAccount ? `Amount (${fromAccount.currency})` : "Amount"
          }
          inputMode="decimal"
          value={fromAmount}
          onChange={(e) => setFromAmount(e.target.value)}
        />

        <SelectMenu
          id="transfer-to"
          label="To"
          value={toId}
          options={toOptions}
          placeholder="Destination account"
          onChange={setToId}
        />

        {cross && toAccount ? (
          <div>
            <Input
              id="transfer-received"
              label={`Received (${toAccount.currency})`}
              inputMode="decimal"
              value={effectiveTo}
              onChange={(e) => {
                setToTouched(true);
                setToAmount(e.target.value);
              }}
            />
            <p className="mt-1.5 text-xs text-text-faint">
              {suggestion
                ? "Pre-filled at today's rate. Adjust to the exact amount received."
                : "Enter the amount that lands in the destination account."}
            </p>
          </div>
        ) : null}

        <Input
          id="transfer-date"
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <Textarea
          id="transfer-note"
          label="Note"
          placeholder="Optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="mt-1 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={!valid || pending}>
            Transfer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
