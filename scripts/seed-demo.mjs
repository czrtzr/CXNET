// Seed the read-only demo (guest) account.
//
// Run after migrations are applied:
//   node --env-file=.env.local scripts/seed-demo.mjs
//
// It is idempotent: every run wipes the demo account's financial rows and lays
// down a fresh, deterministic set, so the demo always looks the same. It will
//   1. allowlist the demo email,
//   2. create the auth user if it does not exist,
//   3. set that profile to the read-only `guest` role,
//   4. clear and reseed accounts, income, expenses, investments, assets,
//      liabilities, debt payments, and a net-worth history trend.
//
// Credentials come from DEMO_EMAIL / DEMO_PASSWORD. The same pair is what the
// app's "Explore the demo" button signs in with, so set them once in .env.local
// (and in your Vercel project) and reuse them here. The service role key is
// required and must never leave your machine or a trusted server.

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.DEMO_EMAIL || "demo@cxnet.app").trim().toLowerCase();

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Run with: node --env-file=.env.local scripts/seed-demo.mjs",
  );
  process.exit(1);
}

const generatedPassword = randomBytes(18).toString("base64url");
const password = process.env.DEMO_PASSWORD || generatedPassword;

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- deterministic helpers -------------------------------------------------
// A tiny seeded PRNG so reseeds are byte-stable: the demo never drifts.
let _seed = 0x9e3779b9;
function rand() {
  _seed = (_seed * 1664525 + 1013904223) >>> 0;
  return _seed / 0xffffffff;
}
function between(lo, hi) {
  return Math.round((lo + rand() * (hi - lo)) * 100) / 100;
}
const NOW = new Date();
function dateMonthsAgo(months, day) {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() - months, day);
  return d.toISOString().slice(0, 10);
}
function dateDaysAgo(days) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function fail(label, error) {
  if (error) {
    console.error(`Failed: ${label}:`, error.message);
    process.exit(1);
  }
}

// 1. Allowlist the demo email so the DB trigger permits the account to exist.
{
  const { error } = await admin
    .from("allowlist")
    .upsert({ email }, { onConflict: "email" });
  fail("allowlist demo email", error);
  console.log(`Allowlisted ${email}`);
}

// 2. Create the auth user if absent, and ensure the password matches what the
//    app will sign in with.
let userId;
{
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (/already.*registered|exists/i.test(error.message)) {
      console.log("Demo auth user already exists.");
    } else {
      fail("create demo user", error);
    }
  } else {
    userId = data.user.id;
    console.log("Created demo auth user.");
    if (!process.env.DEMO_PASSWORD) {
      console.log(
        `\n  Generated demo password (set DEMO_PASSWORD to this in .env.local\n` +
          `  and Vercel so the app can sign in):\n  ${password}\n`,
      );
    }
  }
}

if (!userId) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  if (error || !data) fail("locate demo profile", error || new Error("no row"));
  userId = data.id;

  // Keep the stored password aligned with DEMO_PASSWORD across reseeds.
  if (process.env.DEMO_PASSWORD) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
      password,
    });
    fail("update demo password", pwErr);
  }
}

// 3. Set the read-only guest role and tidy the profile. The service role runs
//    with auth.uid() null, which the guard_profile_changes trigger trusts.
{
  const { error } = await admin
    .from("profiles")
    .update({
      role: "guest",
      display_name: "Demo Account",
      base_currency: "USD",
      has_onboarded: true,
    })
    .eq("id", userId);
  fail("set guest role", error);
  console.log("Set profile to guest (read only).");
}

// 4. Wipe existing demo data. Order matters: deleting liabilities cascades their
//    debt_payments without the reverse trigger refunding anything; deleting the
//    savings rows first means the income/expense reverse postings touch nothing.
for (const table of [
  "liabilities",
  "savings",
  "income",
  "expenses",
  "investments",
  "transfers",
  "assets",
  "reconciliations",
  "balance_history",
]) {
  const { error } = await admin.from(table).delete().eq("user_id", userId);
  fail(`clear ${table}`, error);
}
// Drop the default-account pointers so the savings delete above was unobstructed.
await admin
  .from("profiles")
  .update({ default_income_account_id: null, default_expense_account_id: null })
  .eq("id", userId);
console.log("Cleared previous demo data.");

// --- category lookup -------------------------------------------------------
// Preset categories have user_id null and are shared. Map name -> id per kind.
const catId = { expense: {}, income: {} };
{
  const { data, error } = await admin
    .from("categories")
    .select("id, name, kind")
    .is("user_id", null);
  fail("load preset categories", error);
  for (const c of data) catId[c.kind][c.name] = c.id;
}
const xc = (name) => catId.expense[name] ?? null;
const ic = (name) => catId.income[name] ?? null;

// --- accounts --------------------------------------------------------------
// Chequing starts at 0 and accrues every posting below; the other two hold a
// fixed balance and receive no postings.
async function insertReturning(table, row) {
  const { data, error } = await admin
    .from(table)
    .insert(row)
    .select("id")
    .single();
  fail(`insert ${table}`, error);
  return data.id;
}

const chequingId = await insertReturning("savings", {
  user_id: userId,
  account_name: "Everyday Chequing",
  balance: 0,
  currency: "USD",
  institution: "Meridian",
  goal_amount: null,
});
await insertReturning("savings", {
  user_id: userId,
  account_name: "High Yield Savings",
  balance: 28450,
  currency: "USD",
  apy: 4.25,
  institution: "Wealthsimple",
  goal_amount: 40000,
});
await insertReturning("savings", {
  user_id: userId,
  account_name: "Brokerage Cash",
  balance: 4200,
  currency: "USD",
  institution: "Questrade",
  goal_amount: null,
});

await admin
  .from("profiles")
  .update({
    default_income_account_id: chequingId,
    default_expense_account_id: chequingId,
  })
  .eq("id", userId);

// --- income (posts to chequing) --------------------------------------------
const income = [];
for (let m = 5; m >= 0; m--) {
  income.push({
    user_id: userId,
    source: "TerraNova Labs",
    amount: 6250,
    currency: "USD",
    category_id: ic("Salary"),
    account_id: chequingId,
    posted_amount: 6250,
    date: dateMonthsAgo(m, 1),
  });
}
income.push(
  {
    user_id: userId,
    source: "Freelance design",
    amount: 1400,
    currency: "USD",
    category_id: ic("Freelance"),
    account_id: chequingId,
    posted_amount: 1400,
    date: dateMonthsAgo(3, 18),
  },
  {
    user_id: userId,
    source: "Freelance design",
    amount: 980,
    currency: "USD",
    category_id: ic("Freelance"),
    account_id: chequingId,
    posted_amount: 980,
    date: dateMonthsAgo(1, 22),
  },
  {
    user_id: userId,
    source: "Portfolio dividends",
    amount: 320,
    currency: "USD",
    category_id: ic("Dividends"),
    account_id: chequingId,
    posted_amount: 320,
    date: dateMonthsAgo(2, 12),
  },
);
fail("insert income", (await admin.from("income").insert(income)).error);

// --- expenses (drawn from chequing) ----------------------------------------
const expenses = [];
const pushExp = (description, amount, category, date) =>
  expenses.push({
    user_id: userId,
    description,
    amount,
    currency: "USD",
    category_id: xc(category),
    account_id: chequingId,
    posted_amount: -amount,
    date,
  });

for (let m = 5; m >= 0; m--) {
  pushExp("Apartment rent", 2150, "Housing", dateMonthsAgo(m, 1));
  pushExp("Hydro and water", between(120, 175), "Utilities", dateMonthsAgo(m, 14));
  pushExp("Mobile and internet", 95, "Utilities", dateMonthsAgo(m, 9));
  pushExp("Streaming bundle", 38, "Subscriptions", dateMonthsAgo(m, 6));
  pushExp("Fuel", between(60, 95), "Transport", dateMonthsAgo(m, 11));
  // A few groceries and dining entries scattered through the month.
  for (const day of [4, 13, 24]) {
    pushExp("Grocery run", between(85, 165), "Groceries", dateMonthsAgo(m, day));
  }
  for (const day of [8, 21]) {
    pushExp("Dinner out", between(34, 78), "Dining", dateMonthsAgo(m, day));
  }
}
// A handful of one-off larger items for texture.
pushExp("Winter jacket", 245, "Shopping", dateMonthsAgo(4, 16));
pushExp("Concert tickets", 180, "Entertainment", dateMonthsAgo(2, 9));
pushExp("Dental cleaning", 160, "Health", dateMonthsAgo(3, 7));
pushExp("Flight home", 410, "Travel", dateMonthsAgo(1, 14));
fail("insert expenses", (await admin.from("expenses").insert(expenses)).error);

// --- investments -----------------------------------------------------------
// current_price is set for an immediate sensible value; is_live_priced keeps the
// app's live refresh updating it, and price_is_manual stays false.
fail(
  "insert investments",
  (
    await admin.from("investments").insert([
      {
        user_id: userId,
        ticker: "AAPL",
        name: "Apple Inc.",
        shares: 18,
        purchase_price: 168.4,
        current_price: 212.5,
        currency: "USD",
        type: "stock",
        purchase_date: dateMonthsAgo(14, 5),
      },
      {
        user_id: userId,
        ticker: "MSFT",
        name: "Microsoft Corp.",
        shares: 9,
        purchase_price: 372.1,
        current_price: 441.2,
        currency: "USD",
        type: "stock",
        purchase_date: dateMonthsAgo(11, 19),
      },
      {
        user_id: userId,
        ticker: "VOO",
        name: "Vanguard S&P 500 ETF",
        shares: 14,
        purchase_price: 398.0,
        current_price: 498.3,
        currency: "USD",
        type: "etf",
        purchase_date: dateMonthsAgo(8, 2),
      },
    ])
  ).error,
);

// --- assets and liabilities ------------------------------------------------
const residenceId = await insertReturning("assets", {
  user_id: userId,
  name: "Primary Residence",
  asset_type: "property",
  value: 565000,
  currency: "USD",
  purchase_price: 489000,
  purchase_date: dateMonthsAgo(48, 10),
});

// Mortgage balance is set slightly high; the demo payments below bring it down.
const mortgageId = await insertReturning("liabilities", {
  user_id: userId,
  name: "Home Mortgage",
  liability_type: "mortgage",
  direction: "owed_by_me",
  balance: 388000,
  currency: "USD",
  original_principal: 431000,
  interest_rate: 4.79,
  term_months: 300,
  payment_amount: 2410,
  start_date: dateMonthsAgo(48, 10),
  asset_id: residenceId,
});
await insertReturning("liabilities", {
  user_id: userId,
  name: "Auto Loan",
  liability_type: "auto_loan",
  direction: "owed_by_me",
  balance: 14200,
  currency: "USD",
  original_principal: 28000,
  interest_rate: 6.49,
  term_months: 72,
  payment_amount: 540,
  start_date: dateMonthsAgo(26, 3),
});
await insertReturning("liabilities", {
  user_id: userId,
  name: "Loan to Marcus",
  liability_type: "owed",
  direction: "owed_to_me",
  balance: 1500,
  currency: "USD",
});

// --- debt payments (against the mortgage, from chequing) -------------------
// The trigger drops the mortgage balance by the principal portion and moves the
// account by the full amount.
const payments = [];
for (let m = 2; m >= 0; m--) {
  payments.push({
    user_id: userId,
    liability_id: mortgageId,
    account_id: chequingId,
    amount: 2410,
    principal_amount: 865,
    interest_amount: 1545,
    currency: "USD",
    paid_on: dateMonthsAgo(m, 3),
    note: "Monthly mortgage payment",
  });
}
fail("insert debt_payments", (await admin.from("debt_payments").insert(payments)).error);

// --- net-worth history -----------------------------------------------------
// A gentle upward trend so the dashboard's net-worth graph has shape. Today's
// point is refreshed by the app on each dashboard load, so these are the past.
const history = [];
const assetsBase = 565000 + 28450 + 4200 + 14771; // property + cash + investments
for (let i = 7; i >= 1; i--) {
  const liabilities = 405000 - (7 - i) * 1600; // paying debt down over time
  const drift = (7 - i) * 2900 + between(-700, 700);
  const assets = assetsBase - (7 - i) * 2400 + drift;
  history.push({
    user_id: userId,
    captured_at: new Date(dateDaysAgo(i * 26)).toISOString(),
    assets: Math.round(assets),
    liabilities: Math.round(liabilities),
    net_worth: Math.round(assets - liabilities),
  });
}
fail("insert balance_history", (await admin.from("balance_history").insert(history)).error);

console.log(
  `\nDemo seeded for ${email}: 3 accounts, ${income.length} income, ` +
    `${expenses.length} expenses, 3 investments, 1 asset, 3 liabilities, ` +
    `${payments.length} payments, ${history.length} history points.`,
);
console.log("Done.");
