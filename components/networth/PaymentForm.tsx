"use client";

import { useState } from "react";
import type { Liability } from "@/types";
import {
  monthlyPayment,
  splitNextPayment,
} from "@/lib/finance/amortization";
import { Input } from "@/components/ui/Input";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import type { DebtPaymentInput } from "@/app/(app)/net-worth/actions";

type AccountRef = { id: string; name: string; currency: string };

function numeric(value: string): number {
  return Number(value.replace(/[\s,]/g, ""));
}

// Today as a local-time ISO date, so the default never lands on yesterday for
// anyone behind UTC.
function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// The scheduled payment to pre-fill: the entered figure, or the level payment the
// loan's principal/rate/term imply, never more than what is still owed.
function suggestedPayment(l: Liability): string {
  const balance = Number(l.balance);
  let payment: number | null = null;
  if (l.payment_amount != null) payment = Number(l.payment_amount);
  else if (l.interest_rate != null && l.term_months != null) {
    payment = monthlyPayment(
      Number(l.original_principal ?? l.balance),
      Number(l.interest_rate),
      Number(l.term_months),
    );
  }
  if (payment == null || payment <= 0) return "";
  return String(Math.round(Math.min(payment, balance) * 100) / 100);
}

export function PaymentForm({
  liability,
  accounts,
  pending,
  onSubmit,
  onCancel,
}: {
  liability: Liability;
  accounts: AccountRef[];
  pending: boolean;
  onSubmit: (input: DebtPaymentInput) => void;
  onCancel: () => void;
}) {
  const owedByMe = liability.direction === "owed_by_me";
  const apr = liability.interest_rate != null ? Number(liability.interest_rate) : null;
  const balance = Number(liability.balance);
  // Interest only enters the picture for a debt I owe that carries a rate.
  const hasInterest = owedByMe && apr != null;

  const [amount, setAmount] = useState(() => suggestedPayment(liability));
  const [interest, setInterest] = useState(() => {
    if (!hasInterest) return "";
    const amt = numeric(suggestedPayment(liability));
    if (!Number.isFinite(amt) || amt <= 0) return "";
    return String(Math.round(splitNextPayment(balance, apr!, amt).interest * 100) / 100);
  });
  const [interestEdited, setInterestEdited] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [paidOn, setPaidOn] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const amt = numeric(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(amt) && amt > 0;
  const interestNum = hasInterest && interest.trim() !== "" ? numeric(interest) : 0;
  const principal = Math.max(
    0,
    Math.min(amt > 0 ? amt : 0, (amt > 0 ? amt : 0) - (interestNum > 0 ? interestNum : 0)),
  );

  // Accounts that can take the leg: same currency as the debt, since the posting
  // moves cash with no conversion.
  const eligible = accounts.filter((a) => a.currency === liability.currency);

  function changeAmount(next: string) {
    setAmount(next);
    if (hasInterest && !interestEdited) {
      const n = numeric(next);
      if (Number.isFinite(n) && n > 0) {
        setInterest(
          String(Math.round(splitNextPayment(balance, apr!, n).interest * 100) / 100),
        );
      } else {
        setInterest("");
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!amountValid) return;
    onSubmit({
      liability_id: liability.id,
      account_id: accountId === "" ? null : accountId,
      amount,
      principal_amount: hasInterest ? principal : amount,
      interest_amount: hasInterest ? interest || 0 : 0,
      paid_on: paidOn || null,
      note: note.trim() === "" ? null : note,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-text-muted">
        {owedByMe ? "Owing" : "Owed to you"}{" "}
        <Amount value={balance} currency={liability.currency} tone="plain" className="text-text" />
      </p>

      <Input
        id="payment-amount"
        label={owedByMe ? "Payment" : "Amount received"}
        inputMode="decimal"
        value={amount}
        onChange={(e) => changeAmount(e.target.value)}
        error={touched && !amountValid ? "Enter an amount." : undefined}
        autoFocus
      />

      {hasInterest ? (
        <div className="rounded-sm border border-border bg-surface p-3">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-text-faint">
            Interest split
          </p>
          <Input
            id="payment-interest"
            label="Interest portion"
            inputMode="decimal"
            value={interest}
            onChange={(e) => {
              setInterest(e.target.value);
              setInterestEdited(true);
            }}
          />
          <p className="mt-3 text-xs text-text-muted">
            Principal{" "}
            <Amount value={principal} currency={liability.currency} tone="pos" className="text-text" />{" "}
            pays the debt down, interest is the cost.
          </p>
        </div>
      ) : null}

      <SelectMenu
        id="payment-account"
        label="From account"
        value={accountId}
        onChange={setAccountId}
        options={[
          { value: "", label: "No account", hint: "Balance only" },
          ...eligible.map((a) => ({
            value: a.id,
            label: a.name,
            hint: a.currency,
          })),
        ]}
      />

      <Input
        id="payment-date"
        label="Date"
        type="date"
        value={paidOn}
        onChange={(e) => setPaidOn(e.target.value)}
      />

      <Textarea
        id="payment-note"
        label="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {owedByMe ? "Record payment" : "Record receipt"}
        </Button>
      </div>
    </form>
  );
}
