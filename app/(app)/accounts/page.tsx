import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { getBaseRateMap } from "@/lib/finance/fx";
import { convertBetween } from "@/lib/finance/currencies";
import { positionValue } from "@/lib/finance/calculations";
import { SavingsView, type Adjustment } from "@/components/savings/SavingsView";
import type {
  AccountLogEntry,
  Expense,
  Income,
  Investment,
  Reconciliation,
  Saving,
  Transfer,
} from "@/types";

export default async function AccountsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const [
    { data: savingData },
    { data: reconciliationData },
    { data: transferData },
    { data: incomeData },
    { data: expenseData },
    { data: investmentData },
  ] = await Promise.all([
    ctx.supabase
      .from("savings")
      .select("*")
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("reconciliations")
      .select("*")
      .eq("target_type", "savings"),
    ctx.supabase
      .from("transfers")
      .select("*")
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    // Postings that landed on an account, newest first, for the per-account log.
    ctx.supabase
      .from("income")
      .select("id, source, posted_amount, account_id, currency, date, notes")
      .not("account_id", "is", null)
      .order("date", { ascending: false })
      .limit(250),
    ctx.supabase
      .from("expenses")
      .select("id, description, posted_amount, account_id, currency, date, notes")
      .not("account_id", "is", null)
      .order("date", { ascending: false })
      .limit(250),
    // Positions linked to an account, so an investment account mirrors their
    // live value. Only the fields the valuation needs.
    ctx.supabase
      .from("investments")
      .select("id, name, ticker, shares, current_price, currency, account_id")
      .not("account_id", "is", null),
  ]);

  const rows = (savingData ?? []) as Saving[];
  const reconciliations = (reconciliationData ?? []) as Reconciliation[];
  const transfers = (transferData ?? []) as Transfer[];
  const income = (incomeData ?? []) as Pick<
    Income,
    "id" | "source" | "posted_amount" | "account_id" | "currency" | "date" | "notes"
  >[];
  const expenses = (expenseData ?? []) as Pick<
    Expense,
    "id" | "description" | "posted_amount" | "account_id" | "currency" | "date" | "notes"
  >[];
  const linkedPositions = (investmentData ?? []) as Pick<
    Investment,
    "id" | "name" | "ticker" | "shares" | "current_price" | "currency" | "account_id"
  >[];

  const accountById = new Map(rows.map((r) => [r.id, r]));
  const accountName = new Map(rows.map((r) => [r.id, r.account_name]));

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

  const rateMap = await getBaseRateMap(ctx.base, [
    ...rows.map((r) => r.currency),
    ...linkedPositions.map((p) => p.currency),
  ]);

  // Live mirrored value per account, in that account's own currency: the sum of
  // its linked positions valued at the current price. Net-worth-neutral because
  // the dashboard excludes these same positions from the standalone investments
  // total (see dashboard/page.tsx).
  const linkedValues: Record<string, number> = {};
  for (const p of linkedPositions) {
    if (!p.account_id) continue;
    const acct = accountById.get(p.account_id);
    if (!acct) continue;
    const native = positionValue(Number(p.shares), p.current_price);
    const inAccount = convertBetween(native, p.currency, acct.currency, ctx.base, rateMap);
    if (inAccount == null) continue;
    linkedValues[p.account_id] = (linkedValues[p.account_id] ?? 0) + inAccount;
  }

  // Per-account activity log. Each leg is signed in the account's own currency so
  // the list reads like a ledger. Income/expenses carry their posted_amount (the
  // exact balance delta already in the account's currency); transfers split into
  // an outbound and an inbound leg; reconciliations show the booked adjustment.
  const logs: Record<string, AccountLogEntry[]> = {};
  const push = (accountId: string, entry: AccountLogEntry) => {
    (logs[accountId] ??= []).push(entry);
  };

  for (const i of income) {
    if (!i.account_id || i.posted_amount == null) continue;
    const acct = accountById.get(i.account_id);
    if (!acct) continue;
    push(i.account_id, {
      id: `inc-${i.id}`,
      kind: "income",
      label: i.source,
      amount: Number(i.posted_amount),
      currency: acct.currency,
      date: i.date,
      note: i.notes,
    });
  }
  for (const e of expenses) {
    if (!e.account_id || e.posted_amount == null) continue;
    const acct = accountById.get(e.account_id);
    if (!acct) continue;
    push(e.account_id, {
      id: `exp-${e.id}`,
      kind: "expense",
      label: e.description,
      amount: Number(e.posted_amount),
      currency: acct.currency,
      date: e.date,
      note: e.notes,
    });
  }
  for (const t of transfers) {
    if (t.from_account) {
      const toName = t.to_account ? accountName.get(t.to_account) ?? "account" : "account";
      push(t.from_account, {
        id: `xfer-out-${t.id}`,
        kind: "transfer_out",
        label: `Transfer to ${toName}`,
        amount: -Number(t.from_amount),
        currency: t.from_currency,
        date: t.occurred_at,
        note: t.note,
      });
    }
    if (t.to_account) {
      const fromName = t.from_account
        ? accountName.get(t.from_account) ?? "account"
        : "account";
      push(t.to_account, {
        id: `xfer-in-${t.id}`,
        kind: "transfer_in",
        label: `Transfer from ${fromName}`,
        amount: Number(t.to_amount),
        currency: t.to_currency,
        date: t.occurred_at,
        note: t.note,
      });
    }
  }
  for (const r of reconciliations) {
    if (!r.target_id) continue;
    push(r.target_id, {
      id: `rec-${r.id}`,
      kind: "reconcile",
      label: "Balance adjustment",
      amount: r.direction === "gain" ? Number(r.delta) : -Number(r.delta),
      currency: r.currency,
      date: r.captured_at.slice(0, 10),
      note: r.note,
    });
  }
  // Newest first within each account.
  for (const id of Object.keys(logs)) {
    logs[id].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  return (
    <SavingsView
      rows={rows}
      transfers={transfers}
      adjustments={adjustments}
      linkedValues={linkedValues}
      logs={logs}
      base={ctx.base}
      rateMap={rateMap}
      canWrite={ctx.role !== "guest"}
    />
  );
}
