"use client";

import { useState } from "react";
import type { AccountType, Saving } from "@/types";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "@/types";
import { CURRENCIES } from "@/lib/finance/currencies";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { SavingInput } from "@/app/(app)/accounts/actions";

function numeric(value: string): number {
  return Number(value.replace(/[\s,]/g, ""));
}

export function SavingForm({
  initial,
  base,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Saving;
  base: string;
  pending: boolean;
  onSubmit: (input: SavingInput) => void;
  onCancel: () => void;
}) {
  const [accountName, setAccountName] = useState(initial?.account_name ?? "");
  const [accountType, setAccountType] = useState<AccountType>(
    initial?.account_type ?? "savings",
  );
  const [balance, setBalance] = useState(initial ? String(initial.balance) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? base);
  const [goal, setGoal] = useState(
    initial?.goal_amount != null ? String(initial.goal_amount) : "",
  );
  const [apy, setApy] = useState(initial?.apy != null ? String(initial.apy) : "");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [touched, setTouched] = useState(false);

  const nameValid = accountName.trim() !== "";
  const balanceValid =
    balance.trim() !== "" &&
    !Number.isNaN(numeric(balance));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nameValid || !balanceValid) return;
    onSubmit({
      account_name: accountName,
      account_type: accountType,
      balance,
      currency,
      goal_amount: goal === "" ? null : goal,
      apy: apy === "" ? null : apy,
      institution,
      notes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Input
          id="account"
          label="Account"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          error={touched && !nameValid ? "Name the account." : undefined}
          autoFocus
        />
        <Select
          id="account-type"
          label="Type"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as AccountType)}
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Input
          id="balance"
          label={initial ? "Balance" : "Starting balance"}
          inputMode="decimal"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          error={touched && !balanceValid ? "Enter a balance." : undefined}
        />
        <Select
          id="currency"
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="goal"
          label="Goal"
          inputMode="decimal"
          placeholder="Optional"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <Input
          id="apy"
          label="APY %"
          inputMode="decimal"
          placeholder="Optional"
          value={apy}
          onChange={(e) => setApy(e.target.value)}
        />
      </div>

      <Input
        id="institution"
        label="Institution"
        placeholder="Optional"
        value={institution}
        onChange={(e) => setInstitution(e.target.value)}
      />

      <Textarea
        id="notes"
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {initial ? "Save changes" : "Add account"}
        </Button>
      </div>
    </form>
  );
}
