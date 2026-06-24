"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, cleanText, isValidDate } from "@/lib/finance/input";
import { isCurrencyCode } from "@/lib/finance/currencies";
import { ACCOUNT_TYPES, type AccountType } from "@/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type SavingInput = {
  account_name: string;
  account_type?: AccountType;
  balance: number | string;
  currency: string;
  goal_amount?: number | string | null;
  apy?: number | string | null;
  institution?: string | null;
  notes?: string | null;
};

const NO_SESSION = "Your session has ended. Sign in again.";
const SAVE_FAILED = "That did not save. Try again.";

function optionalAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  return parseAmount(value);
}

type BuiltSaving = {
  account_name: string;
  account_type: AccountType;
  balance: number;
  currency: string;
  goal_amount: number | null;
  apy: number | null;
  institution: string | null;
  notes: string | null;
};

function build(
  input: SavingInput,
): { ok: false; error: string } | { ok: true; payload: BuiltSaving } {
  const accountName = cleanText(input.account_name, 120);
  if (!accountName) return { ok: false, error: "Name the account." };

  const balance = parseAmount(input.balance);
  if (balance == null) return { ok: false, error: "Enter a balance." };

  if (!isCurrencyCode(input.currency))
    return { ok: false, error: "Pick a currency." };

  const goal = optionalAmount(input.goal_amount);
  if (input.goal_amount != null && input.goal_amount !== "" && goal == null)
    return { ok: false, error: "Enter a valid goal." };

  const apy = optionalAmount(input.apy);
  if (input.apy != null && input.apy !== "" && apy == null)
    return { ok: false, error: "Enter a valid rate." };

  const accountType: AccountType = ACCOUNT_TYPES.includes(
    input.account_type as AccountType,
  )
    ? (input.account_type as AccountType)
    : "savings";

  return {
    ok: true,
    payload: {
      account_name: accountName,
      account_type: accountType,
      balance,
      currency: input.currency,
      goal_amount: goal,
      apy,
      institution: cleanText(input.institution, 120),
      notes: cleanText(input.notes, 1000),
    },
  };
}

export async function createSaving(input: SavingInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  const { error: dbError } = await supabase
    .from("savings")
    .insert({ ...built.payload, user_id: user.id });
  if (dbError) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/accounts");
  return { ok: true };
}

export async function updateSaving(
  id: string,
  input: SavingInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  const { error: dbError } = await supabase
    .from("savings")
    .update(built.payload)
    .eq("id", id)
    .eq("user_id", user.id);
  if (dbError) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/accounts");
  return { ok: true };
}

export async function deleteSaving(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("savings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "That did not delete. Try again." };

  revalidatePath("/accounts");
  return { ok: true };
}

// Set the true balance of an account. The gap against the tracked balance is
// booked as a real entry — an income when the true total is higher, an expense
// when lower — tagged to the account so the posting trigger moves the balance to
// exactly the figure entered. The adjustment therefore shows up in cashflow and
// the account log like any other movement, rather than living in a separate
// ledger. The current balance is re-read server side so the result lands on the
// entered figure even if the balance shifted since the dialog opened.
export async function reconcileSaving(
  id: string,
  actual: number | string,
  note?: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const actualBalance = parseAmount(actual);
  if (actualBalance == null) return { ok: false, error: "Enter the true balance." };

  const { data: account } = await supabase
    .from("savings")
    .select("balance, currency")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!account) return { ok: false, error: "Pick an account you own." };

  // The signed delta needed to reach the entered balance, in the account's own
  // currency. posted_amount carries this exact figure, so the trigger lands the
  // balance on `actual`.
  const delta = actualBalance - Number(account.balance);
  if (delta === 0) return { ok: true };

  const today = new Date().toISOString().slice(0, 10);
  const cleanNote = cleanText(note, 500);

  const { error } =
    delta > 0
      ? await supabase.from("income").insert({
          user_id: user.id,
          source: "Balance adjustment",
          amount: delta,
          currency: account.currency,
          account_id: id,
          posted_amount: delta,
          date: today,
          notes: cleanNote,
        })
      : await supabase.from("expenses").insert({
          user_id: user.id,
          description: "Balance adjustment",
          amount: -delta,
          currency: account.currency,
          account_id: id,
          posted_amount: delta,
          date: today,
          notes: cleanNote,
        });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/accounts");
  revalidatePath(delta > 0 ? "/income" : "/expenses");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type TransferInput = {
  from_account: string;
  to_account: string;
  from_amount: number | string;
  to_amount: number | string;
  note?: string | null;
  occurred_at: string;
};

// Record a move of money between two of the user's accounts. The posting trigger
// moves both balances (out of the source, into the destination) atomically with
// the insert; cross-currency carries a separate amount on each side. Both ends
// are verified to belong to the caller so a stray id cannot touch another user.
export async function createTransfer(input: TransferInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  if (!input.from_account || !input.to_account)
    return { ok: false, error: "Pick both accounts." };
  if (input.from_account === input.to_account)
    return { ok: false, error: "Pick two different accounts." };

  const fromAmount = parseAmount(input.from_amount);
  const toAmount = parseAmount(input.to_amount);
  if (fromAmount == null || fromAmount <= 0)
    return { ok: false, error: "Enter the amount to move." };
  if (toAmount == null || toAmount <= 0)
    return { ok: false, error: "Enter the amount received." };
  if (!isValidDate(input.occurred_at)) return { ok: false, error: "Pick a date." };

  // Both accounts must be the caller's own; pull their currencies in one read.
  const { data: accts } = await supabase
    .from("savings")
    .select("id, currency")
    .in("id", [input.from_account, input.to_account]);
  const from = accts?.find((a) => a.id === input.from_account);
  const to = accts?.find((a) => a.id === input.to_account);
  if (!from || !to) return { ok: false, error: "Pick an account you own." };

  const { error } = await supabase.from("transfers").insert({
    user_id: user.id,
    from_account: input.from_account,
    to_account: input.to_account,
    from_amount: fromAmount,
    from_currency: from.currency,
    to_amount: toAmount,
    to_currency: to.currency,
    note: cleanText(input.note, 500),
    occurred_at: input.occurred_at,
  });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Unwind a transfer. Deleting the row fires the posting trigger in reverse, so
// both balances return to where they were.
export async function deleteTransfer(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("transfers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "That did not delete. Try again." };

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}
