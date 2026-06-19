import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { IncomeView } from "@/components/income/IncomeView";
import type { Income } from "@/types";

export default async function IncomePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const { data } = await ctx.supabase
    .from("income")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Income[];
  const currencies = rows.map((r) => r.currency);
  const rateMap = await getBaseRateMap(ctx.base, currencies);

  return (
    <IncomeView
      rows={rows}
      base={ctx.base}
      rateMap={rateMap}
      canWrite={ctx.role !== "guest"}
    />
  );
}
