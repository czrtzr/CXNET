"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCurrencyCode } from "@/lib/finance/currencies";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NO_SESSION = "Your session has ended. Sign in again.";

// Set the account's native (base) currency. Every screen totals and converts
// against this, so a successful change purges the whole client cache and the
// app re-reads with the new base on the next view.
export async function updateBaseCurrency(code: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  if (!isCurrencyCode(code)) return { ok: false, error: "Pick a currency." };

  // The guard_profile_changes trigger only blocks role and active changes, so a
  // base_currency update on your own row passes; guests are stopped by RLS.
  const { error } = await supabase
    .from("profiles")
    .update({ base_currency: code })
    .eq("id", user.id);
  if (error) return { ok: false, error: "That did not save. Try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

// Set the accounts each new income and expense pre-fills. A null clears a
// default. Ids that are not the caller's own account are rejected, so a stray id
// cannot point a default at someone else's row.
export async function updateDefaultAccounts(
  incomeAccountId: string | null,
  expenseAccountId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const wanted = [incomeAccountId, expenseAccountId].filter(
    (id): id is string => id != null,
  );
  if (wanted.length > 0) {
    const { data: owned } = await supabase
      .from("savings")
      .select("id")
      .in("id", wanted);
    const ownedIds = new Set((owned ?? []).map((r) => r.id));
    if (wanted.some((id) => !ownedIds.has(id)))
      return { ok: false, error: "Pick an account you own." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      default_income_account_id: incomeAccountId,
      default_expense_account_id: expenseAccountId,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "That did not save. Try again." };

  revalidatePath("/income");
  revalidatePath("/expenses");
  revalidatePath("/settings");
  return { ok: true };
}
