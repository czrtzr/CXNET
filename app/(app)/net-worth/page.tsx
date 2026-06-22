import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { convertToBase, convertBetween } from "@/lib/finance/currencies";
import { positionValue } from "@/lib/finance/calculations";
import { NetWorthView } from "@/components/networth/NetWorthView";
import type { Asset, Liability, Saving, Investment, DebtPayment } from "@/types";

export default async function NetWorthPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const [
    { data: assetData },
    { data: liabilityData },
    { data: savingData },
    { data: investmentData },
    { data: paymentData },
  ] = await Promise.all([
    ctx.supabase.from("assets").select("*").order("created_at", { ascending: false }),
    ctx.supabase
      .from("liabilities")
      .select("*")
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("savings")
      .select("id, account_name, balance, currency")
      .order("account_name"),
    ctx.supabase.from("investments").select("shares, current_price, currency"),
    ctx.supabase
      .from("debt_payments")
      .select("*")
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const assets = (assetData ?? []) as Asset[];
  const liabilities = (liabilityData ?? []) as Liability[];
  const savings = (savingData ?? []) as Pick<
    Saving,
    "id" | "account_name" | "balance" | "currency"
  >[];
  const investments = (investmentData ?? []) as Pick<
    Investment,
    "shares" | "current_price" | "currency"
  >[];
  const payments = (paymentData ?? []) as DebtPayment[];

  const rateMap = await getBaseRateMap(ctx.base, [
    ...assets.map((a) => a.currency),
    ...liabilities.map((l) => l.currency),
    ...savings.map((s) => s.currency),
    ...investments.map((i) => i.currency),
  ]);

  const sumBase = (
    rows: { amount: number; currency: string }[],
  ): { total: number; unconverted: number } => {
    let total = 0;
    let unconverted = 0;
    for (const r of rows) {
      const v = convertToBase(r.amount, r.currency, ctx.base, rateMap);
      if (v == null) unconverted += 1;
      else total += v;
    }
    return { total, unconverted };
  };

  // Cash and investments come from their own screens; the view adds tangible
  // assets and nets liabilities itself, so its hero stays live as rows are
  // edited. Only the two cross-screen subtotals need computing here.
  const cash = sumBase(savings.map((s) => ({ amount: Number(s.balance), currency: s.currency })));
  const investmentsSum = sumBase(
    investments.map((i) => ({
      amount: positionValue(Number(i.shares), i.current_price),
      currency: i.currency,
    })),
  );

  // Debt secured against each asset, in the asset's own currency, for the equity
  // figure (value − debt) shown on the asset card.
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const linkedDebt: Record<string, number> = {};
  for (const l of liabilities) {
    if (l.direction !== "owed_by_me" || !l.asset_id) continue;
    const asset = assetById.get(l.asset_id);
    if (!asset) continue;
    const inAsset = convertBetween(Number(l.balance), l.currency, asset.currency, ctx.base, rateMap);
    if (inAsset == null) continue;
    linkedDebt[l.asset_id] = (linkedDebt[l.asset_id] ?? 0) + inAsset;
  }

  const accounts = savings.map((s) => ({
    id: s.id,
    name: s.account_name,
    currency: s.currency,
  }));

  return (
    <NetWorthView
      assets={assets}
      liabilities={liabilities}
      linkedDebt={linkedDebt}
      payments={payments}
      accounts={accounts}
      base={ctx.base}
      rateMap={rateMap}
      cashTotal={cash.total}
      investmentsTotal={investmentsSum.total}
      canWrite={ctx.role !== "guest"}
    />
  );
}
