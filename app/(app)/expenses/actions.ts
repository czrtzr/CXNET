"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  parseAmount,
  isValidDate,
  cleanText,
  isHexColor,
} from "@/lib/finance/input";
import { isCurrencyCode } from "@/lib/finance/currencies";
import { accountDelta } from "@/lib/finance/posting";
import {
  RECURRENCE_INTERVALS,
  CATEGORY_KINDS,
  type Category,
  type CategoryKind,
  type RecurrenceInterval,
} from "@/types";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CategoryResult =
  | { ok: true; category: Category }
  | { ok: false; error: string };

export type ExpenseInput = {
  description: string;
  amount: number | string;
  currency: string;
  category_id: string | null;
  account_id?: string | null;
  date: string;
  notes?: string | null;
  is_recurring: boolean;
  recurrence: RecurrenceInterval | null;
};

// An expense that posts to an account refreshes that account's balance and the
// net-worth views, not just the expense list.
function revalidateAll() {
  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

const NO_SESSION = "Your session has ended. Sign in again.";
const SAVE_FAILED = "That did not save. Try again.";

type BuiltExpense = {
  description: string;
  amount: number;
  currency: string;
  category_id: string | null;
  account_id: string | null;
  date: string;
  notes: string | null;
  is_recurring: boolean;
  recurrence: RecurrenceInterval | null;
};

function build(
  input: ExpenseInput,
): { ok: false; error: string } | { ok: true; payload: BuiltExpense } {
  const description = cleanText(input.description, 160);
  if (!description) return { ok: false, error: "Describe the expense." };

  const amount = parseAmount(input.amount);
  if (amount == null || amount < 0)
    return { ok: false, error: "Enter a valid amount." };

  if (!isCurrencyCode(input.currency))
    return { ok: false, error: "Pick a currency." };
  if (!isValidDate(input.date)) return { ok: false, error: "Pick a date." };

  const isRecurring = Boolean(input.is_recurring);
  let recurrence: RecurrenceInterval | null = null;
  if (isRecurring) {
    if (!input.recurrence || !RECURRENCE_INTERVALS.includes(input.recurrence))
      return { ok: false, error: "Choose how often it recurs." };
    recurrence = input.recurrence;
  }

  return {
    ok: true,
    payload: {
      description,
      amount,
      currency: input.currency,
      category_id: input.category_id || null,
      account_id: input.account_id || null,
      date: input.date,
      notes: cleanText(input.notes, 1000),
      is_recurring: isRecurring,
      recurrence,
    },
  };
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  const posted_amount = await accountDelta(
    supabase,
    user.id,
    built.payload.account_id,
    built.payload.amount,
    built.payload.currency,
    -1,
  );

  const { error: dbError } = await supabase
    .from("expenses")
    .insert({ ...built.payload, posted_amount, user_id: user.id });
  if (dbError) return { ok: false, error: SAVE_FAILED };

  revalidateAll();
  return { ok: true };
}

export async function updateExpense(
  id: string,
  input: ExpenseInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  const posted_amount = await accountDelta(
    supabase,
    user.id,
    built.payload.account_id,
    built.payload.amount,
    built.payload.currency,
    -1,
  );

  const { error: dbError } = await supabase
    .from("expenses")
    .update({ ...built.payload, posted_amount })
    .eq("id", id)
    .eq("user_id", user.id);
  if (dbError) return { ok: false, error: SAVE_FAILED };

  revalidateAll();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "That did not delete. Try again." };

  revalidateAll();
  return { ok: true };
}

// Create a custom expense category. Returns the row so the form can select it
// immediately, before the page revalidates.
export async function createCategory(
  name: string,
  color: string,
  kind: CategoryKind = "expense",
): Promise<CategoryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const clean = cleanText(name, 60);
  if (!clean) return { ok: false, error: "Name the category." };
  if (!isHexColor(color)) return { ok: false, error: "Pick a color." };
  const safeKind: CategoryKind = CATEGORY_KINDS.includes(kind) ? kind : "expense";

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name: clean, color, kind: safeKind })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: SAVE_FAILED };

  // Both screens read categories; refresh whichever the new one belongs to.
  revalidatePath(safeKind === "income" ? "/income" : "/expenses");
  return { ok: true, category: data as Category };
}
