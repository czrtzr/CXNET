"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, cleanText } from "@/lib/finance/input";
import { isCurrencyCode } from "@/lib/finance/currencies";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type SavingInput = {
  account_name: string;
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

  return {
    ok: true,
    payload: {
      account_name: accountName,
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

  revalidatePath("/savings");
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

  revalidatePath("/savings");
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

  revalidatePath("/savings");
  return { ok: true };
}

// Set the true balance of a savings account. The gap against the tracked balance
// is booked as a single labeled adjustment in reconciliations (a gain when the
// real total is higher, a shortfall when lower), then the balance snaps to the
// actual figure. Nothing is silently overwritten: the adjustment is the record
// of what moved. The audit row is written first, so a later failure leaves a
// trace rather than a quietly changed balance.
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

  const { data: account, error: readError } = await supabase
    .from("savings")
    .select("balance, currency, account_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (readError || !account) return { ok: false, error: SAVE_FAILED };

  const previous = Number(account.balance);
  const diff = actualBalance - previous;
  if (diff === 0) return { ok: true };

  const { error: logError } = await supabase.from("reconciliations").insert({
    user_id: user.id,
    target_type: "savings",
    target_id: id,
    account_label: account.account_name,
    previous_balance: previous,
    actual_balance: actualBalance,
    delta: Math.abs(diff),
    direction: diff > 0 ? "gain" : "shortfall",
    currency: account.currency,
    note: cleanText(note, 500),
  });
  if (logError) return { ok: false, error: SAVE_FAILED };

  const { error: updateError } = await supabase
    .from("savings")
    .update({ balance: actualBalance })
    .eq("id", id)
    .eq("user_id", user.id);
  if (updateError) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/savings");
  return { ok: true };
}
