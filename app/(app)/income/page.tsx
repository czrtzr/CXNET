import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { IncomeView } from "@/components/income/IncomeView";
import type { Category, Income } from "@/types";

export default async function IncomePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const [{ data }, { data: categoryData }] = await Promise.all([
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
  ]);

  const rows = (data ?? []) as Income[];
  const categories = (categoryData ?? []) as Category[];
  const currencies = rows.map((r) => r.currency);
  const rateMap = await getBaseRateMap(ctx.base, currencies);

  return (
    <IncomeView
      rows={rows}
      categories={categories}
      base={ctx.base}
      rateMap={rateMap}
      canWrite={ctx.role !== "guest"}
    />
  );
}
