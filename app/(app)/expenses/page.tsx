import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { generateDueRecurring } from "@/lib/finance/recurring";
import { ExpensesView } from "@/components/expenses/ExpensesView";
import type { AccountRef, Category, Expense, RecurringRule } from "@/types";

export default async function ExpensesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  if (ctx.role !== "guest") await generateDueRecurring(ctx.supabase, ctx.userId);

  const [
    { data: expenseData },
    { data: categoryData },
    { data: accountData },
    { data: ruleData },
  ] = await Promise.all([
    ctx.supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    // RLS returns presets (null user_id) plus the user's own categories.
    ctx.supabase
      .from("categories")
      .select("*")
      .eq("kind", "expense")
      .order("name", { ascending: true }),
    ctx.supabase
      .from("savings")
      .select("id, account_name, account_type, currency")
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("recurring_rules")
      .select("*")
      .eq("kind", "expense")
      .order("created_at", { ascending: false }),
  ]);

  const rows = (expenseData ?? []) as Expense[];
  const categories = (categoryData ?? []) as Category[];
  const accounts = (accountData ?? []) as AccountRef[];
  const rules = (ruleData ?? []) as RecurringRule[];
  const rateMap = await getBaseRateMap(ctx.base, [
    ...rows.map((r) => r.currency),
    ...rules.map((r) => r.currency),
  ]);

  return (
    <ExpensesView
      rows={rows}
      categories={categories}
      accounts={accounts}
      rules={rules}
      defaultAccountId={ctx.defaultExpenseAccountId}
      base={ctx.base}
      rateMap={rateMap}
      canWrite={ctx.role !== "guest"}
    />
  );
}
