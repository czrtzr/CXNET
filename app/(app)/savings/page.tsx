import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { SavingsView, type Adjustment } from "@/components/savings/SavingsView";
import type { Reconciliation, Saving } from "@/types";

export default async function SavingsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const [{ data: savingData }, { data: reconciliationData }] = await Promise.all([
    ctx.supabase
      .from("savings")
      .select("*")
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("reconciliations")
      .select("*")
      .eq("target_type", "savings"),
  ]);

  const rows = (savingData ?? []) as Saving[];
  const reconciliations = (reconciliationData ?? []) as Reconciliation[];

  // Net adjustment per account: gains add, shortfalls subtract.
  const adjustments: Record<string, Adjustment> = {};
  for (const r of reconciliations) {
    if (!r.target_id) continue;
    const signed = r.direction === "gain" ? r.delta : -r.delta;
    const current = adjustments[r.target_id] ?? { net: 0, count: 0 };
    adjustments[r.target_id] = {
      net: current.net + Number(signed),
      count: current.count + 1,
    };
  }

  const rateMap = await getBaseRateMap(
    ctx.base,
    rows.map((r) => r.currency),
  );

  return (
    <SavingsView
      rows={rows}
      adjustments={adjustments}
      base={ctx.base}
      rateMap={rateMap}
      canWrite={ctx.role !== "guest"}
    />
  );
}
