import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { InvestmentsView } from "@/components/investments/InvestmentsView";
import type { Investment, Reconciliation } from "@/types";

export default async function InvestmentsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const [{ data: investmentData }, { data: reconciliationData }] =
    await Promise.all([
      ctx.supabase
        .from("investments")
        .select("*")
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("reconciliations")
        .select("target_id")
        .eq("target_type", "investment"),
    ]);

  const rows = (investmentData ?? []) as Investment[];
  const adjustedIds = Array.from(
    new Set(
      ((reconciliationData ?? []) as Pick<Reconciliation, "target_id">[])
        .map((r) => r.target_id)
        .filter((id): id is string => id != null),
    ),
  );

  const rateMap = await getBaseRateMap(
    ctx.base,
    rows.map((r) => r.currency),
  );

  return (
    <InvestmentsView
      rows={rows}
      adjustedIds={adjustedIds}
      base={ctx.base}
      rateMap={rateMap}
      canWrite={ctx.role !== "guest"}
    />
  );
}
