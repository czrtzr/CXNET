import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { InvestmentsView } from "@/components/investments/InvestmentsView";
import type { AccountRef, Investment, Reconciliation } from "@/types";

export default async function InvestmentsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const [{ data: investmentData }, { data: reconciliationData }, { data: accountData }] =
    await Promise.all([
      ctx.supabase
        .from("investments")
        .select("*")
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("reconciliations")
        .select("target_id")
        .eq("target_type", "investment"),
      ctx.supabase
        .from("savings")
        .select("id, account_name, account_type, currency")
        .order("created_at", { ascending: false }),
    ]);

  const rows = (investmentData ?? []) as Investment[];
  const accounts = (accountData ?? []) as AccountRef[];
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
      accounts={accounts}
      base={ctx.base}
      rateMap={rateMap}
      canWrite={ctx.role !== "guest"}
    />
  );
}
