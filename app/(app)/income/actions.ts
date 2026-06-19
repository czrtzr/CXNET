"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, isValidDate, cleanText } from "@/lib/finance/input";
import { isCurrencyCode } from "@/lib/finance/currencies";
import { INCOME_FREQUENCIES, type IncomeFrequency } from "@/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type IncomeInput = {
  source: string;
  amount: number | string;
  currency: string;
  frequency: IncomeFrequency;
  category_id?: string | null;
  date: string;
  notes?: string | null;
};

const NO_SESSION = "Your session has ended. Sign in again.";
const SAVE_FAILED = "That did not save. Try again.";

type BuiltIncome = {
  source: string;
  amount: number;
  currency: string;
  frequency: IncomeFrequency;
  category_id: string | null;
  date: string;
  notes: string | null;
};

// Shape a raw input into a validated row payload, or return an error message.
function build(
  input: IncomeInput,
): { ok: false; error: string } | { ok: true; payload: BuiltIncome } {
  const source = cleanText(input.source, 120);
  if (!source) return { ok: false, error: "Name the income source." };

  const amount = parseAmount(input.amount);
  if (amount == null || amount < 0)
    return { ok: false, error: "Enter a valid amount." };

  if (!isCurrencyCode(input.currency))
    return { ok: false, error: "Pick a currency." };
  if (!INCOME_FREQUENCIES.includes(input.frequency))
    return { ok: false, error: "Pick how often this arrives." };
  if (!isValidDate(input.date)) return { ok: false, error: "Pick a date." };

  return {
    ok: true,
    payload: {
      source,
      amount,
      currency: input.currency,
      frequency: input.frequency,
      // A blank selection clears the category; otherwise trust the id and let
      // the foreign key reject anything that is not a real category.
      category_id: input.category_id ? input.category_id : null,
      date: input.date,
      notes: cleanText(input.notes, 1000),
    },
  };
}

export async function createIncome(input: IncomeInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  const { error: dbError } = await supabase
    .from("income")
    .insert({ ...built.payload, user_id: user.id });
  if (dbError) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/income");
  return { ok: true };
}

export async function updateIncome(
  id: string,
  input: IncomeInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  const { error: dbError } = await supabase
    .from("income")
    .update(built.payload)
    .eq("id", id)
    .eq("user_id", user.id);
  if (dbError) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/income");
  return { ok: true };
}

export async function deleteIncome(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("income")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "That did not delete. Try again." };

  revalidatePath("/income");
  return { ok: true };
}
