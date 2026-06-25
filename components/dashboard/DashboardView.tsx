"use client";

import { CountUp } from "@/components/ui/CountUp";
import { Amount } from "@/components/ui/Amount";
import { formatPercent } from "@/lib/finance/format";
import { Card } from "@/components/ui/Card";
import { CertificateFrame } from "@/components/svg/CertificateFrame";
import { Guilloche } from "@/components/svg/Guilloche";
import { DrawUnderline } from "@/components/svg/DrawUnderline";
import { PulseLine } from "@/components/svg/PulseLine";
import { PageTransition } from "@/components/layout/PageTransition";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import {
  IncomeIcon,
  ExpensesIcon,
  InvestmentsIcon,
  RefreshIcon,
  SavingsIcon,
} from "@/components/svg/icons";
import { AllocationDonut, type Segment } from "./AllocationDonut";
import { CashflowStrip } from "./CashflowStrip";
import { MainChart } from "./MainChart";
import type { CashEntry, TrendPoint } from "@/lib/finance/timeframe";

type Activity = {
  id: string;
  kind: "income" | "expense" | "reconcile" | "position" | "transfer";
  label: string;
  sublabel: string | null;
  amount: number;
  currency: string;
  tone: "pos" | "neg" | "muted";
  t: number;
};

type Props = {
  displayName: string;
  base: string;
  netWorth: number;
  accountsTotal: number;
  investmentsTotal: number;
  debtsTotal: number;
  investmentGain: number;
  monthlyIncome: number;
  monthlyExpense: number;
  unconverted: number;
  hasData: boolean;
  allocation: Segment[];
  trend: TrendPoint[];
  activity: Activity[];
  incomeFlow: CashEntry[];
  expenseFlow: CashEntry[];
  spendingByCategory: Segment[];
  incomeByCategory: Segment[];
};

const GLYPH = {
  income: IncomeIcon,
  expense: ExpensesIcon,
  reconcile: RefreshIcon,
  position: InvestmentsIcon,
  transfer: SavingsIcon,
};

function relativeDay(t: number): string {
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.18em] text-text-faint">{children}</p>
  );
}

export function DashboardView({
  displayName,
  base,
  netWorth,
  accountsTotal,
  investmentsTotal,
  debtsTotal,
  investmentGain,
  monthlyIncome,
  monthlyExpense,
  unconverted,
  hasData,
  allocation,
  trend,
  activity,
  incomeFlow,
  expenseFlow,
  spendingByCategory,
  incomeByCategory,
}: Props) {
  const firstName = displayName.trim().split(/\s+/)[0] || "there";

  // Recurring monthly headroom and what share of income it keeps - the link
  // between the income and expense screens, read at a glance.
  const monthlyNet = monthlyIncome - monthlyExpense;
  const savingsRate =
    monthlyIncome > 0 ? (monthlyNet / monthlyIncome) * 100 : null;

  return (
    <PageTransition>
      <SectionLabel>Overview</SectionLabel>

      {/* Net worth hero */}
      <div className="relative mt-4 overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 text-leather/60">
          <Guilloche size={320} opacity={0.1} rings={6} />
        </div>

        <CertificateFrame>
          {hasData ? (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Net worth
              </p>
              <p className="mt-3 font-serif text-5xl tracking-tight text-text">
                <CountUp value={netWorth} currency={base} quiet code />
              </p>
              <div className="mt-2 flex items-center gap-3">
                <DrawUnderline width={170} className="text-brass" />
                <PulseLine width={120} height={22} className="text-brass/60" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-text-muted">
                <span>
                  Accounts <Amount value={accountsTotal} currency={base} tone="plain" quiet />
                </span>
                <span>
                  Investments{" "}
                  <Amount value={investmentsTotal} currency={base} tone="plain" quiet />
                </span>
                {investmentsTotal > 0 ? (
                  <span>
                    Unrealized{" "}
                    <Amount
                      value={investmentGain}
                      currency={base}
                      signed
                      tone={investmentGain >= 0 ? "pos" : "neg"}
                      quiet
                    />
                  </span>
                ) : null}
                {debtsTotal > 0 ? (
                  <span>
                    Debts{" "}
                    <Amount value={-debtsTotal} currency={base} tone="neg" quiet />
                  </span>
                ) : null}
                {unconverted > 0 ? (
                  <span className="text-text-faint">
                    {unconverted} item{unconverted === 1 ? "" : "s"} in other currencies
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Welcome, {firstName}
              </p>
              <p className="mt-3 font-serif text-4xl tracking-tight text-text">
                Awaiting your first entries
              </p>
              <p className="mt-3 max-w-md text-sm text-text-muted">
                Add savings and positions to see your net worth take shape, with a
                daily history line that grows from here.
              </p>
            </>
          )}
        </CertificateFrame>
      </div>

      {!hasData ? null : (
        <>
          {/* Headline chart: net worth or cashflow, over a shared timeframe */}
          <Reveal delay={0.1}>
            <Card className="mt-6 px-5 py-5">
              <MainChart
                trend={trend}
                income={incomeFlow}
                expense={expenseFlow}
                currency={base}
              />
            </Card>
          </Reveal>

          {/* Allocation + category breakdowns (last three months) */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Reveal delay={0.22}>
              <Card className="h-full px-5 py-5">
                <SectionLabel>Allocation</SectionLabel>
                <div className="mt-5">
                  {allocation.length > 0 ? (
                    <AllocationDonut segments={allocation} currency={base} />
                  ) : (
                    <p className="text-sm text-text-muted">Nothing to allocate yet.</p>
                  )}
                </div>
              </Card>
            </Reveal>

            {spendingByCategory.length > 0 ? (
              <Reveal delay={0.28}>
                <Card className="h-full px-5 py-5">
                  <SectionLabel>Spending by category</SectionLabel>
                  <p className="mt-1 text-xs text-text-faint">Last 3 months.</p>
                  <div className="mt-4">
                    <AllocationDonut segments={spendingByCategory} currency={base} />
                  </div>
                </Card>
              </Reveal>
            ) : null}

            {incomeByCategory.length > 0 ? (
              <Reveal delay={0.34}>
                <Card className="h-full px-5 py-5">
                  <SectionLabel>Income by category</SectionLabel>
                  <p className="mt-1 text-xs text-text-faint">Last 3 months.</p>
                  <div className="mt-4">
                    <AllocationDonut segments={incomeByCategory} currency={base} />
                  </div>
                </Card>
              </Reveal>
            ) : null}
          </div>

          {/* Recurring budget view + recent activity */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Reveal delay={0.3}>
              <Card className="flex h-full flex-col px-5 py-5">
                <SectionLabel>Monthly cashflow</SectionLabel>
                <p className="mt-1 text-xs text-text-faint">
                  Recurring income against spend.
                </p>
                <div className="mt-5 flex-1">
                  <CashflowStrip
                    income={monthlyIncome}
                    expense={monthlyExpense}
                    currency={base}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-text-muted">
                    Net{" "}
                    <Amount
                      value={monthlyNet}
                      currency={base}
                      signed
                      tone={monthlyNet >= 0 ? "pos" : "neg"}
                    />
                    <span className="text-text-faint"> / mo</span>
                  </span>
                  {savingsRate != null ? (
                    <span className="text-text-muted">
                      Saving{" "}
                      <span
                        className={
                          savingsRate >= 0 ? "tabular-nums text-pos" : "tabular-nums text-neg"
                        }
                      >
                        {formatPercent(savingsRate, { decimals: 0 })}
                      </span>
                    </span>
                  ) : null}
                </div>
              </Card>
            </Reveal>

            <Reveal delay={0.36}>
              <Card className="h-full px-5 py-5">
                <SectionLabel>Recent activity</SectionLabel>
                {activity.length > 0 ? (
                  <RevealGroup delay={0.42} stagger={0.07} className="mt-4 space-y-3">
                    {activity.map((item) => {
                      const Glyph = GLYPH[item.kind];
                      return (
                        <RevealItem key={item.id}>
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-text-muted">
                              <Glyph size={14} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-text">{item.label}</p>
                              <p className="text-xs text-text-faint">
                                {item.sublabel} · {relativeDay(item.t)}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm">
                              <Amount
                                value={item.amount}
                                currency={item.currency}
                                signed={item.tone !== "muted"}
                                tone={item.tone}
                                quiet
                              />
                            </span>
                          </div>
                        </RevealItem>
                      );
                    })}
                  </RevealGroup>
                ) : (
                  <p className="mt-4 text-sm text-text-muted">No activity yet.</p>
                )}
              </Card>
            </Reveal>
          </div>
        </>
      )}
    </PageTransition>
  );
}
