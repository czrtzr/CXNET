import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { SettingsView } from "@/components/settings/SettingsView";
import type { AccountRef } from "@/types";

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const { data: accountData } = await ctx.supabase
    .from("savings")
    .select("id, account_name, currency")
    .order("created_at", { ascending: false });
  const accounts = (accountData ?? []) as AccountRef[];

  return (
    <SettingsView
      base={ctx.base}
      displayName={ctx.displayName}
      accounts={accounts}
      defaultIncomeAccountId={ctx.defaultIncomeAccountId}
      defaultExpenseAccountId={ctx.defaultExpenseAccountId}
      canWrite={ctx.role !== "guest"}
    />
  );
}
