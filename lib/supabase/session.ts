import { createClient } from "./server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types";

// One read of "who is asking" for server pages and actions. Returns the verified
// user, their role and base currency, and the request-scoped client to reuse for
// data queries. Null when there is no session, so callers redirect to /login.
export type SessionContext = {
  supabase: SupabaseClient;
  userId: string;
  role: UserRole;
  base: string;
  displayName: string;
  defaultIncomeAccountId: string | null;
  defaultExpenseAccountId: string | null;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, base_currency, display_name, email, default_income_account_id, default_expense_account_id",
    )
    .eq("id", user.id)
    .single();

  return {
    supabase,
    userId: user.id,
    role: (profile?.role as UserRole | undefined) ?? "user",
    base: profile?.base_currency ?? "USD",
    displayName: profile?.display_name ?? profile?.email ?? user.email ?? "",
    defaultIncomeAccountId: profile?.default_income_account_id ?? null,
    defaultExpenseAccountId: profile?.default_expense_account_id ?? null,
  };
}
