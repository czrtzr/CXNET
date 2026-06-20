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
