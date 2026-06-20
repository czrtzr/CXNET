import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { generateDueRecurring } from "@/lib/finance/recurring";
import { IncomeView } from "@/components/income/IncomeView";
import type { AccountRef, Category, Income, RecurringRule } from "@/types";

export default async function IncomePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  // Materialize any due recurring entries before reading the list, so a salary
  // that came due shows up here and has already posted to its account.
  if (ctx.role !== "guest") await generateDueRecurring(ctx.supabase, ctx.userId);

  const [{ data }, { data: categoryData }, { data: accountData }, { data: ruleData }] =
    await Promise.all([
      ctx.supabase
        .from("income")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      // RLS returns presets (null user_id) plus the user's own income categories.
      ctx.supabase
        .from("categories")
        .select("*")
        .eq("kind", "income")
        .order("name", { ascending: true }),
      ctx.supabase
        .from("savings")
        .select("id, account_name, account_type, currency")
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("recurring_rules")
        .select("*")
        .eq("kind", "income")
        .order("created_at", { ascending: false }),
    ]);

  const rows = (data ?? []) as Income[];
  const categories = (categoryData ?? []) as Category[];
  const accounts = (accountData ?? []) as AccountRef[];
  const rules = (ruleData ?? []) as RecurringRule[];
  const currencies = rows.map((r) => r.currency);
  const rateMap = await getBaseRateMap(ctx.base, [
    ...currencies,
    ...rules.map((r) => r.currency),
  ]);

  return (
    <IncomeView
      rows={rows}
      categories={categories}
      accounts={accounts}
      rules={rules}
      defaultAccountId={ctx.defaultIncomeAccountId}
      base={ctx.base}
      rateMap={rateMap}
      canWrite={ctx.role !== "guest"}
    />
  );
}
