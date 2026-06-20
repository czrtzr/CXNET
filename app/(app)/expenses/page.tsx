import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { ExpensesView } from "@/components/expenses/ExpensesView";
import type { AccountRef, Category, Expense } from "@/types";

export default async function ExpensesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const [{ data: expenseData }, { data: categoryData }, { data: accountData }] =
    await Promise.all([
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
    ]);

  const rows = (expenseData ?? []) as Expense[];
  const categories = (categoryData ?? []) as Category[];
  const accounts = (accountData ?? []) as AccountRef[];
  const rateMap = await getBaseRateMap(
    ctx.base,
    rows.map((r) => r.currency),
  );

  return (
    <ExpensesView
      rows={rows}
      categories={categories}
      accounts={accounts}
      defaultAccountId={ctx.defaultExpenseAccountId}
      base={ctx.base}
      rateMap={rateMap}
      canWrite={ctx.role !== "guest"}
    />
  );
}
