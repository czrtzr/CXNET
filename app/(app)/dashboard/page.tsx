import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { convertToBase } from "@/lib/finance/currencies";
import {
  positionValue,
  costBasis,
  monthlyEquivalent,
  expenseMonthlyEquivalent,
} from "@/lib/finance/calculations";
import { DashboardView } from "@/components/dashboard/DashboardView";
import type {
  Investment,
  Saving,
  Income,
  Expense,
  Reconciliation,
  BalanceSnapshot,
  InvestmentType,
} from "@/types";

// Investment types fold into a handful of allocation buckets so the donut reads
// at a glance rather than splintering across every holding.
const ALLOCATION_BUCKETS: Record<InvestmentType, string> = {
  stock: "Equities",
  etf: "Equities",
  crypto: "Crypto",
  bond: "Bonds",
  real_estate: "Real estate",
  other: "Other",
};

function startOfTodayUtc(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function DashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const [
    { data: savingData },
    { data: investmentData },
    { data: incomeData },
    { data: expenseData },
    { data: reconciliationData },
  ] = await Promise.all([
    ctx.supabase.from("savings").select("*"),
    ctx.supabase.from("investments").select("*"),
    ctx.supabase.from("income").select("*"),
    ctx.supabase.from("expenses").select("*"),
    ctx.supabase
      .from("reconciliations")
      .select("*")
      .order("captured_at", { ascending: false })
      .limit(12),
  ]);

  const savings = (savingData ?? []) as Saving[];
  const investments = (investmentData ?? []) as Investment[];
  const income = (incomeData ?? []) as Income[];
  const expenses = (expenseData ?? []) as Expense[];
  const reconciliations = (reconciliationData ?? []) as Reconciliation[];

  // One rate map covers every currency on the page.
  const rateMap = await getBaseRateMap(ctx.base, [
    ...savings.map((r) => r.currency),
    ...investments.map((r) => r.currency),
    ...income.map((r) => r.currency),
    ...expenses.map((r) => r.currency),
  ]);

  // Anything that cannot convert to base is left out of totals and counted, the
  // same honest treatment the savings and investment screens use.
  let unconverted = 0;
  let savingsTotal = 0;
  for (const s of savings) {
    const v = convertToBase(Number(s.balance), s.currency, ctx.base, rateMap);
    if (v == null) {
      unconverted += 1;
      continue;
    }
    savingsTotal += v;
  }

  let investmentsTotal = 0;
  let investmentCost = 0;
  const bucketTotals = new Map<string, number>();
  for (const inv of investments) {
    const value = convertToBase(
      positionValue(inv.shares, inv.current_price),
      inv.currency,
      ctx.base,
      rateMap,
    );
    if (value == null) {
      unconverted += 1;
      continue;
    }
    investmentsTotal += value;
    // Cost basis only counts when there is a live price to compare against, so a
    // position whose price has not loaded yet cannot read as a phantom loss.
    if (inv.current_price != null && inv.purchase_price != null) {
      const cost = convertToBase(
        costBasis(inv.shares, inv.purchase_price),
        inv.currency,
        ctx.base,
        rateMap,
      );
      if (cost != null) investmentCost += cost;
    }
    const bucket = ALLOCATION_BUCKETS[inv.type] ?? "Other";
    bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + value);
  }

  const netWorth = savingsTotal + investmentsTotal;
  const investmentGain = investmentsTotal - investmentCost;

  // Allocation segments: cash first, then each investment bucket, largest last
  // so the donut sweeps from the steadiest holding outward.
  const allocation = [
    { key: "cash", label: "Cash & savings", value: savingsTotal },
    ...Array.from(bucketTotals, ([label, value]) => ({
      key: label,
      label,
      value,
    })),
  ]
    .filter((seg) => seg.value > 0)
    .sort((a, b) => b.value - a.value);

  // Recurring monthly cashflow, both sides normalized to a monthly figure.
  let monthlyIncome = 0;
  for (const i of income) {
    const v = convertToBase(
      monthlyEquivalent(Number(i.amount), i.frequency),
      i.currency,
      ctx.base,
      rateMap,
    );
    if (v != null) monthlyIncome += v;
  }
  let monthlyExpense = 0;
  for (const e of expenses) {
    if (!e.is_recurring) continue;
    const v = convertToBase(
      expenseMonthlyEquivalent(Number(e.amount), e.recurrence),
      e.currency,
      ctx.base,
      rateMap,
    );
    if (v != null) monthlyExpense += v;
  }

  // Capture today's net worth once, for real owners with something to track, so
  // the trend line is built from honest daily points rather than estimates.
  if (ctx.role !== "guest" && (savings.length > 0 || investments.length > 0)) {
    const { data: lastSnap } = await ctx.supabase
      .from("balance_history")
      .select("captured_at")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    // Compare as instants, not strings: timestamptz comes back in a different
    // ISO shape than our midnight marker, so a lexical compare is unsafe.
    const capturedToday =
      lastSnap?.captured_at != null &&
      new Date(lastSnap.captured_at).getTime() >= Date.parse(startOfTodayUtc());
    if (!capturedToday) {
      await ctx.supabase.from("balance_history").insert({
        user_id: ctx.userId,
        net_worth: netWorth,
        assets: netWorth,
        liabilities: 0,
      });
    }
  }

  const { data: historyData } = await ctx.supabase
    .from("balance_history")
    .select("*")
    .order("captured_at", { ascending: true })
    .limit(365);
  // One point per calendar day, the latest winning, so a day captured more than
  // once never doubles a node on the line.
  const byDay = new Map<string, { t: number; v: number }>();
  for (const row of (historyData ?? []) as BalanceSnapshot[]) {
    byDay.set(row.captured_at.slice(0, 10), {
      t: new Date(row.captured_at).getTime(),
      v: Number(row.net_worth),
    });
  }
  const trend = Array.from(byDay.values());

  // Recent activity: one timestamp-sorted stream across every kind of entry.
  type Activity = {
    id: string;
    kind: "income" | "expense" | "reconcile" | "position";
    label: string;
    sublabel: string | null;
    amount: number;
    currency: string;
    tone: "pos" | "neg" | "muted";
    t: number;
  };
  const activity: Activity[] = [];
  for (const i of income)
    activity.push({
      id: `inc-${i.id}`,
      kind: "income",
      label: i.source,
      sublabel: "Income",
      amount: Number(i.amount),
      currency: i.currency,
      tone: "pos",
      t: new Date(i.date).getTime(),
    });
  for (const e of expenses)
    activity.push({
      id: `exp-${e.id}`,
      kind: "expense",
      label: e.description,
      sublabel: "Expense",
      amount: -Number(e.amount),
      currency: e.currency,
      tone: "neg",
      t: new Date(e.date).getTime(),
    });
  for (const r of reconciliations)
    activity.push({
      id: `rec-${r.id}`,
      kind: "reconcile",
      label: r.account_label,
      sublabel: r.direction === "gain" ? "Adjusted up" : "Adjusted down",
      amount: r.direction === "gain" ? Number(r.delta) : -Number(r.delta),
      currency: r.currency,
      tone: r.direction === "gain" ? "pos" : "neg",
      t: new Date(r.captured_at).getTime(),
    });
  for (const inv of investments)
    activity.push({
      id: `pos-${inv.id}`,
      kind: "position",
      label: inv.name ?? inv.ticker ?? "Position",
      sublabel: "Position added",
      amount: positionValue(inv.shares, inv.current_price),
      currency: inv.currency,
      tone: "muted",
      t: new Date(inv.created_at).getTime(),
    });
  activity.sort((a, b) => b.t - a.t);

  return (
    <DashboardView
      displayName={ctx.displayName}
      base={ctx.base}
      netWorth={netWorth}
      savingsTotal={savingsTotal}
      investmentsTotal={investmentsTotal}
      investmentGain={investmentGain}
      monthlyIncome={monthlyIncome}
      monthlyExpense={monthlyExpense}
      unconverted={unconverted}
      hasData={savings.length > 0 || investments.length > 0}
      allocation={allocation}
      trend={trend}
      activity={activity.slice(0, 8)}
    />
  );
}
