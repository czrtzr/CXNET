"use client";

import { motion } from "motion/react";
import { CountUp } from "@/components/ui/CountUp";
import { Amount } from "@/components/ui/Amount";
import { Card } from "@/components/ui/Card";
import { CertificateFrame } from "@/components/svg/CertificateFrame";
import { Guilloche } from "@/components/svg/Guilloche";
import { PageTransition } from "@/components/layout/PageTransition";
import {
  IncomeIcon,
  ExpensesIcon,
  InvestmentsIcon,
  RefreshIcon,
} from "@/components/svg/icons";
import { AllocationDonut, type Segment } from "./AllocationDonut";
import { NetWorthTrend, type TrendPoint } from "./NetWorthTrend";
import { CashflowStrip } from "./CashflowStrip";

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

type Props = {
  displayName: string;
  base: string;
  netWorth: number;
  savingsTotal: number;
  investmentsTotal: number;
  investmentGain: number;
  monthlyIncome: number;
  monthlyExpense: number;
  unconverted: number;
  hasData: boolean;
  allocation: Segment[];
  trend: TrendPoint[];
  activity: Activity[];
};

const GLYPH = {
  income: IncomeIcon,
  expense: ExpensesIcon,
  reconcile: RefreshIcon,
  position: InvestmentsIcon,
};

function relativeDay(t: number): string {
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// A reveal that eases its children in once, staggered, for the signature
// settling-into-place feel on the overview.
function Reveal({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
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
  savingsTotal,
  investmentsTotal,
  investmentGain,
  monthlyIncome,
  monthlyExpense,
  unconverted,
  hasData,
  allocation,
  trend,
  activity,
}: Props) {
  const firstName = displayName.trim().split(/\s+/)[0] || "there";

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
                <CountUp value={netWorth} currency={base} quiet />
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-text-muted">
                <span>
                  Savings <Amount value={savingsTotal} currency={base} tone="plain" quiet />
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
          {/* Net worth over time */}
          <Reveal delay={0.1}>
            <Card className="mt-6 px-5 py-5">
              <SectionLabel>Net worth over time</SectionLabel>
              <div className="mt-4">
                <NetWorthTrend points={trend} currency={base} />
              </div>
            </Card>
          </Reveal>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Allocation */}
            <Reveal delay={0.18}>
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

            {/* Cashflow */}
            <Reveal delay={0.24}>
              <Card className="flex h-full flex-col px-5 py-5">
                <SectionLabel>Monthly cashflow</SectionLabel>
                <p className="mt-1 text-xs text-text-faint">Recurring income against spend.</p>
                <div className="mt-5 flex-1">
                  <CashflowStrip
                    income={monthlyIncome}
                    expense={monthlyExpense}
                    currency={base}
                  />
                </div>
              </Card>
            </Reveal>

            {/* Recent activity */}
            <Reveal delay={0.3}>
              <Card className="h-full px-5 py-5">
                <SectionLabel>Recent activity</SectionLabel>
                {activity.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {activity.map((item) => {
                      const Glyph = GLYPH[item.kind];
                      return (
                        <li key={item.id} className="flex items-center gap-3">
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
                        </li>
                      );
                    })}
                  </ul>
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
