import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBaseRateMap } from "@/lib/finance/fx";
import { convertToBase, isCurrencyCode } from "@/lib/finance/currencies";
import { positionValue } from "@/lib/finance/calculations";
import { accountDelta } from "@/lib/finance/posting";
import { parseAmount, cleanText, isValidDate } from "@/lib/finance/input";

// Every function here takes the resolved MCP user id and scopes every query to
// it. The admin (service-role) client bypasses RLS, so this scoping IS the
// isolation boundary - a user id is never read from tool arguments. Reads and
// writes mirror the app's own server actions so balances and net worth stay
// consistent across the UI and the connector.

type DB = SupabaseClient;

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

async function baseCurrency(db: DB, userId: string): Promise<string> {
  const { data } = await db
    .from("profiles")
    .select("base_currency")
    .eq("id", userId)
    .single();
  return data?.base_currency ?? "USD";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- Reads --------------------------------------------------------------------

// Net worth and its components, in the user's base currency. Mirrors the
// dashboard formula exactly: account-linked positions count under accounts and
// are excluded from the standalone investments figure, never both.
export async function getNetWorth(db: DB, userId: string): Promise<ToolResult> {
  const base = await baseCurrency(db, userId);
  const [{ data: sav }, { data: inv }, { data: ast }, { data: lia }] =
    await Promise.all([
      db.from("savings").select("balance, currency").eq("user_id", userId),
      db
        .from("investments")
        .select("shares, current_price, currency, account_id")
        .eq("user_id", userId),
      db.from("assets").select("value, currency").eq("user_id", userId),
      db.from("liabilities").select("balance, currency, direction").eq("user_id", userId),
    ]);

  const savings = sav ?? [];
  const investments = inv ?? [];
  const assets = ast ?? [];
  const liabilities = lia ?? [];

  const rateMap = await getBaseRateMap(base, [
    ...savings.map((r) => r.currency),
    ...investments.map((r) => r.currency),
    ...assets.map((r) => r.currency),
    ...liabilities.map((r) => r.currency),
  ]);

  let unconverted = 0;
  const add = (amount: number, currency: string): number => {
    const v = convertToBase(amount, currency, base, rateMap);
    if (v == null) {
      unconverted += 1;
      return 0;
    }
    return v;
  };

  let cash = 0;
  for (const s of savings) cash += add(Number(s.balance), s.currency);

  let linked = 0;
  let standaloneInvestments = 0;
  for (const i of investments) {
    const v = add(positionValue(Number(i.shares), i.current_price), i.currency);
    if (i.account_id) linked += v;
    else standaloneInvestments += v;
  }

  let tangible = 0;
  for (const a of assets) tangible += add(Number(a.value), a.currency);

  let receivable = 0;
  let debts = 0;
  for (const l of liabilities) {
    const v = add(Number(l.balance), l.currency);
    if (l.direction === "owed_to_me") receivable += v;
    else debts += v;
  }

  const accountsTotal = cash + linked;
  const assetsTotal = accountsTotal + standaloneInvestments + tangible + receivable;
  const netWorth = assetsTotal - debts;

  return {
    ok: true,
    data: {
      base_currency: base,
      net_worth: round(netWorth),
      accounts: round(accountsTotal),
      investments: round(standaloneInvestments),
      tangible_assets: round(tangible),
      receivables: round(receivable),
      debts: round(debts),
      ...(unconverted > 0
        ? { note: `${unconverted} holding(s) had no exchange rate and were left out.` }
        : {}),
    },
  };
}

export async function listAccounts(db: DB, userId: string): Promise<ToolResult> {
  const { data } = await db
    .from("savings")
    .select("account_name, account_type, balance, currency, institution")
    .eq("user_id", userId)
    .order("account_name");
  return {
    ok: true,
    data: (data ?? []).map((a) => ({
      name: a.account_name,
      type: a.account_type,
      balance: round(Number(a.balance)),
      currency: a.currency,
      institution: a.institution ?? null,
    })),
  };
}

export async function recentTransactions(
  db: DB,
  userId: string,
  limit: number,
): Promise<ToolResult> {
  const cap = Math.min(Math.max(limit, 1), 100);
  const [{ data: inc }, { data: exp }] = await Promise.all([
    db
      .from("income")
      .select("source, amount, currency, date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(cap),
    db
      .from("expenses")
      .select("description, amount, currency, date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(cap),
  ]);

  const rows = [
    ...(inc ?? []).map((r) => ({
      type: "income" as const,
      label: r.source,
      amount: round(Number(r.amount)),
      currency: r.currency,
      date: r.date,
    })),
    ...(exp ?? []).map((r) => ({
      type: "expense" as const,
      label: r.description,
      amount: round(Number(r.amount)),
      currency: r.currency,
      date: r.date,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, cap);

  return { ok: true, data: rows };
}

// Expense totals by category since a cutoff date, in base currency.
export async function spendingByCategory(
  db: DB,
  userId: string,
  since: string,
): Promise<ToolResult> {
  const base = await baseCurrency(db, userId);
  const [{ data: exp }, { data: cats }] = await Promise.all([
    db
      .from("expenses")
      .select("amount, currency, category_id, date")
      .eq("user_id", userId)
      .gte("date", since),
    db.from("categories").select("id, name").eq("kind", "expense"),
  ]);

  const expenses = exp ?? [];
  const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
  const rateMap = await getBaseRateMap(base, expenses.map((r) => r.currency));

  const sums = new Map<string, number>();
  for (const e of expenses) {
    const v = convertToBase(Number(e.amount), e.currency, base, rateMap);
    if (v == null) continue;
    const key = e.category_id ?? "uncategorized";
    sums.set(key, (sums.get(key) ?? 0) + v);
  }

  const data = Array.from(sums, ([key, value]) => ({
    category: key === "uncategorized" ? "Uncategorized" : catName.get(key) ?? "Category",
    total: round(value),
  })).sort((a, b) => b.total - a.total);

  return { ok: true, data: { base_currency: base, since, categories: data } };
}

// Income vs expense totals for a calendar month (YYYY-MM), in base currency.
export async function monthlyCashflow(
  db: DB,
  userId: string,
  month: string,
): Promise<ToolResult> {
  const base = await baseCurrency(db, userId);
  const start = `${month}-01`;
  // First day of the next month, derived without date math edge cases.
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const [{ data: inc }, { data: exp }] = await Promise.all([
    db
      .from("income")
      .select("amount, currency")
      .eq("user_id", userId)
      .gte("date", start)
      .lt("date", next),
    db
      .from("expenses")
      .select("amount, currency")
      .eq("user_id", userId)
      .gte("date", start)
      .lt("date", next),
  ]);

  const income = inc ?? [];
  const expenses = exp ?? [];
  const rateMap = await getBaseRateMap(base, [
    ...income.map((r) => r.currency),
    ...expenses.map((r) => r.currency),
  ]);
  const sum = (rows: { amount: number; currency: string }[]) =>
    rows.reduce((t, r) => t + (convertToBase(Number(r.amount), r.currency, base, rateMap) ?? 0), 0);

  const incomeTotal = sum(income);
  const expenseTotal = sum(expenses);

  return {
    ok: true,
    data: {
      base_currency: base,
      month,
      income: round(incomeTotal),
      expenses: round(expenseTotal),
      net: round(incomeTotal - expenseTotal),
    },
  };
}

// --- Writes -------------------------------------------------------------------

// Resolve the account to post against: an explicit name match, else the user's
// configured default for this kind. Returns the account id or null (no posting).
async function resolveAccount(
  db: DB,
  userId: string,
  accountName: string | undefined,
  kind: "income" | "expense",
): Promise<string | null> {
  if (accountName) {
    const { data } = await db
      .from("savings")
      .select("id")
      .eq("user_id", userId)
      .ilike("account_name", accountName)
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }
  const { data } = await db
    .from("profiles")
    .select("default_income_account_id, default_expense_account_id")
    .eq("id", userId)
    .single();
  return kind === "income"
    ? data?.default_income_account_id ?? null
    : data?.default_expense_account_id ?? null;
}

async function resolveCurrency(
  db: DB,
  userId: string,
  currency: string | undefined,
): Promise<string | { error: string }> {
  if (currency) {
    if (!isCurrencyCode(currency)) return { error: "Unknown currency code." };
    return currency;
  }
  return baseCurrency(db, userId);
}

export async function addExpense(
  db: DB,
  userId: string,
  args: {
    description: string;
    amount: number;
    currency?: string;
    account?: string;
    date?: string;
    notes?: string;
  },
): Promise<ToolResult> {
  const description = cleanText(args.description, 160);
  if (!description) return { ok: false, error: "An expense needs a description." };
  const amount = parseAmount(args.amount);
  if (amount == null || amount < 0) return { ok: false, error: "Enter a valid amount." };
  const currency = await resolveCurrency(db, userId, args.currency);
  if (typeof currency !== "string") return { ok: false, error: currency.error };
  const date = args.date ?? today();
  if (!isValidDate(date)) return { ok: false, error: "Date must be YYYY-MM-DD." };

  const account_id = await resolveAccount(db, userId, args.account, "expense");
  const posted_amount = await accountDelta(db, userId, account_id, amount, currency, -1);

  const { error } = await db.from("expenses").insert({
    user_id: userId,
    description,
    amount,
    currency,
    account_id,
    posted_amount,
    date,
    notes: cleanText(args.notes, 1000),
  });
  if (error) return { ok: false, error: "Could not save the expense." };
  return { ok: true, data: { saved: true, description, amount: round(amount), currency, date } };
}

export async function addIncome(
  db: DB,
  userId: string,
  args: {
    source: string;
    amount: number;
    currency?: string;
    account?: string;
    date?: string;
    notes?: string;
  },
): Promise<ToolResult> {
  const source = cleanText(args.source, 120);
  if (!source) return { ok: false, error: "Income needs a source." };
  const amount = parseAmount(args.amount);
  if (amount == null || amount < 0) return { ok: false, error: "Enter a valid amount." };
  const currency = await resolveCurrency(db, userId, args.currency);
  if (typeof currency !== "string") return { ok: false, error: currency.error };
  const date = args.date ?? today();
  if (!isValidDate(date)) return { ok: false, error: "Date must be YYYY-MM-DD." };

  const account_id = await resolveAccount(db, userId, args.account, "income");
  const posted_amount = await accountDelta(db, userId, account_id, amount, currency, 1);

  const { error } = await db.from("income").insert({
    user_id: userId,
    source,
    amount,
    currency,
    account_id,
    posted_amount,
    date,
    notes: cleanText(args.notes, 1000),
  });
  if (error) return { ok: false, error: "Could not save the income." };
  return { ok: true, data: { saved: true, source, amount: round(amount), currency, date } };
}

// Record a payment against a debt, matched by liability name. Mirrors the app's
// recordDebtPayment: the payment currency is fixed by the debt, an optional
// account is debited, and cross-currency uses today's rate for the account leg.
export async function recordPayment(
  db: DB,
  userId: string,
  args: { debt: string; amount: number; account?: string; note?: string; paid_on?: string },
): Promise<ToolResult> {
  const { data: liability } = await db
    .from("liabilities")
    .select("id, name, currency")
    .eq("user_id", userId)
    .ilike("name", args.debt)
    .limit(1)
    .maybeSingle();
  if (!liability) return { ok: false, error: `No debt named "${args.debt}".` };

  const amount = parseAmount(args.amount);
  if (amount == null || amount <= 0) return { ok: false, error: "Enter an amount above zero." };
  if (args.paid_on && !isValidDate(args.paid_on))
    return { ok: false, error: "paid_on must be YYYY-MM-DD." };

  let account_id: string | null = null;
  let account_amount: number | null = null;
  if (args.account) {
    const { data: account } = await db
      .from("savings")
      .select("id, currency")
      .eq("user_id", userId)
      .ilike("account_name", args.account)
      .limit(1)
      .maybeSingle();
    if (!account) return { ok: false, error: `No account named "${args.account}".` };
    account_id = account.id;
    if (account.currency !== liability.currency) {
      // Convert the payment into the account's currency at today's rate; fall
      // back to the raw amount if no rate, matching the app's best-effort stance.
      const rateMap = await getBaseRateMap(account.currency, [liability.currency]);
      account_amount =
        convertToBase(amount, liability.currency, account.currency, rateMap) ?? amount;
    }
  }

  const { error } = await db.from("debt_payments").insert({
    user_id: userId,
    liability_id: liability.id,
    account_id,
    amount,
    principal_amount: amount,
    interest_amount: 0,
    account_amount,
    currency: liability.currency,
    ...(args.paid_on ? { paid_on: args.paid_on } : {}),
    note: cleanText(args.note, 500),
  });
  if (error) return { ok: false, error: "Could not record the payment." };
  return {
    ok: true,
    data: { recorded: true, debt: liability.name, amount: round(amount), currency: liability.currency },
  };
}
