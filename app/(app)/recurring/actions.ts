"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, cleanText, isValidDate } from "@/lib/finance/input";
import { isCurrencyCode } from "@/lib/finance/currencies";
import {
  CATEGORY_KINDS,
  RECURRENCE_INTERVALS,
  type CategoryKind,
  type RecurrenceInterval,
} from "@/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type RuleInput = {
  kind: CategoryKind;
  label: string;
  amount: number | string;
  currency: string;
  account_id?: string | null;
  category_id?: string | null;
  cadence: RecurrenceInterval;
  anchor_date: string;
  notes?: string | null;
};

const NO_SESSION = "Your session has ended. Sign in again.";
const SAVE_FAILED = "That did not save. Try again.";

// A recurring rule touches the entry list, the account balances it posts to, and
// every net-worth view, so changing one refreshes all of them.
function revalidateAll() {
  revalidatePath("/income");
  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

type BuiltRule = {
  kind: CategoryKind;
  label: string;
  amount: number;
  currency: string;
  account_id: string | null;
  category_id: string | null;
  cadence: RecurrenceInterval;
  notes: string | null;
};

function build(
  input: RuleInput,
): { ok: false; error: string } | { ok: true; payload: BuiltRule } {
  if (!CATEGORY_KINDS.includes(input.kind))
    return { ok: false, error: "Pick income or expense." };

  const label = cleanText(input.label, 120);
  if (!label) return { ok: false, error: "Name it." };

  const amount = parseAmount(input.amount);
  if (amount == null || amount <= 0)
    return { ok: false, error: "Enter an amount." };

  if (!isCurrencyCode(input.currency))
    return { ok: false, error: "Pick a currency." };
  if (!RECURRENCE_INTERVALS.includes(input.cadence))
    return { ok: false, error: "Pick how often it repeats." };

  return {
    ok: true,
    payload: {
      kind: input.kind,
      label,
      amount,
      currency: input.currency,
      account_id: input.account_id ? input.account_id : null,
      category_id: input.category_id ? input.category_id : null,
      cadence: input.cadence,
      notes: cleanText(input.notes, 1000),
    },
  };
}

export async function createRule(input: RuleInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  if (!isValidDate(input.anchor_date))
    return { ok: false, error: "Pick a start date." };

  // The first occurrence is due on the anchor; the generator fills it (and any
  // past periods) on the next load of a money screen.
  const { error } = await supabase.from("recurring_rules").insert({
    ...built.payload,
    user_id: user.id,
    anchor_date: input.anchor_date,
    next_run: input.anchor_date,
    active: true,
  });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateAll();
  return { ok: true };
}

// Edit the shape of a rule. anchor_date and next_run are left alone so editing
// the amount or label never retroactively regenerates or skips occurrences.
export async function updateRule(
  id: string,
  input: RuleInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  const { error } = await supabase
    .from("recurring_rules")
    .update(built.payload)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateAll();
  return { ok: true };
}

export async function toggleRule(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("recurring_rules")
    .update({ active })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateAll();
  return { ok: true };
}

// Remove a rule. Entries it already generated stay (their link is set null), so
// history is never rewritten.
export async function deleteRule(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("recurring_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "That did not delete. Try again." };

  revalidateAll();
  return { ok: true };
}
