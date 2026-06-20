import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBaseRateMap } from "./fx";
import { convertToBase } from "./currencies";

// The signed delta a posting applies to its account's balance, expressed in the
// account's own currency. Income passes sign +1, expense -1. The figure is
// stored on the entry so a later edit or delete reverses it exactly.
//
// Returns null when there is no account, the account no longer exists, or it is
// not the caller's, in which case nothing should post. A cross-currency entry is
// converted at today's rate; if that rate is unavailable the raw amount is used
// rather than dropping the posting, the same best-effort stance the FX layer
// takes elsewhere.
export async function accountDelta(
  supabase: SupabaseClient,
  userId: string,
  accountId: string | null,
  amount: number,
  currency: string,
  sign: 1 | -1,
): Promise<number | null> {
  if (!accountId) return null;

  const { data: account } = await supabase
    .from("savings")
    .select("currency, user_id")
    .eq("id", accountId)
    .single();
  if (!account || account.user_id !== userId) return null;

  let magnitude = amount;
  if (account.currency !== currency) {
    const rateMap = await getBaseRateMap(account.currency, [currency]);
    const converted = convertToBase(amount, currency, account.currency, rateMap);
    if (converted != null) magnitude = converted;
  }

  return sign * magnitude;
}
