import { PageTransition } from "@/components/layout/PageTransition";
import { CertificateFrame } from "@/components/svg/CertificateFrame";
import { Card } from "@/components/ui/Card";
import { Guilloche } from "@/components/svg/Guilloche";

// Phase 2 dashboard: the styled empty shell. Real numbers, the certificate
// count-up, and the bespoke charts arrive in Phase 5.
export default function DashboardPage() {
  return (
    <PageTransition>
      <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
        Overview
      </p>

      <div className="relative mt-4 overflow-hidden">
        {/* Guilloche watermark sits behind the hero figure. */}
        <div className="pointer-events-none absolute -right-16 -top-16 text-leather/60">
          <Guilloche size={320} opacity={0.1} rings={6} />
        </div>

        <CertificateFrame>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Net worth
          </p>
          <p className="mt-3 font-serif text-5xl tracking-tight text-text">
            Awaiting your first entries
          </p>
          <p className="mt-3 text-sm text-text-muted">
            Add income, expenses, savings, and positions to see your worth take
            shape here.
          </p>
        </CertificateFrame>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Cashflow", note: "Monthly income against spend." },
          { title: "Spending", note: "Where the month goes, by category." },
          { title: "Allocation", note: "How the portfolio is spread." },
        ].map((c) => (
          <Card key={c.title} className="px-5 py-5">
            <p className="text-xs uppercase tracking-[0.18em] text-text-faint">
              {c.title}
            </p>
            <p className="mt-2 text-sm text-text-muted">{c.note}</p>
            <p className="mt-6 font-mono text-xs text-text-faint">
              No data yet
            </p>
          </Card>
        ))}
      </div>
    </PageTransition>
  );
}
