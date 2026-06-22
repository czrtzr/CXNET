"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, cleanText, isValidDate } from "@/lib/finance/input";
import { isCurrencyCode } from "@/lib/finance/currencies";
import {
  ASSET_TYPES,
  LIABILITY_TYPES,
  DEBT_DIRECTIONS,
  type AssetType,
  type LiabilityType,
  type DebtDirection,
} from "@/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NO_SESSION = "Your session has ended. Sign in again.";
const SAVE_FAILED = "That did not save. Try again.";

function revalidateAll() {
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}

// A debt payment moves a cash account, so its screen has to re-read too.
function revalidateWithAccounts() {
  revalidateAll();
  revalidatePath("/accounts");
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------
export type AssetInput = {
  name: string;
  asset_type: AssetType;
  value: number | string;
  currency: string;
  purchase_price?: number | string | null;
  purchase_date?: string | null;
  notes?: string | null;
};

function buildAsset(input: AssetInput) {
  const name = cleanText(input.name, 120);
  if (!name) return { ok: false as const, error: "Name the asset." };

  const value = parseAmount(input.value);
  if (value == null) return { ok: false as const, error: "Enter a value." };

  if (!isCurrencyCode(input.currency))
    return { ok: false as const, error: "Pick a currency." };

  const purchase =
    input.purchase_price == null || input.purchase_price === ""
      ? null
      : parseAmount(input.purchase_price);
  if (input.purchase_price && purchase == null)
    return { ok: false as const, error: "Enter a valid purchase price." };

  if (input.purchase_date && !isValidDate(input.purchase_date))
    return { ok: false as const, error: "Pick a valid date." };

  return {
    ok: true as const,
    payload: {
      name,
      asset_type: ASSET_TYPES.includes(input.asset_type)
        ? input.asset_type
        : "other",
      value,
      currency: input.currency,
      purchase_price: purchase,
      purchase_date: input.purchase_date || null,
      notes: cleanText(input.notes, 1000),
    },
  };
}

export async function createAsset(input: AssetInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = buildAsset(input);
  if (!built.ok) return built;

  const { error } = await supabase
    .from("assets")
    .insert({ ...built.payload, user_id: user.id });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateAll();
  return { ok: true };
}

export async function updateAsset(
  id: string,
  input: AssetInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = buildAsset(input);
  if (!built.ok) return built;

  const { error } = await supabase
    .from("assets")
    .update(built.payload)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateAll();
  return { ok: true };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "That did not delete. Try again." };

  revalidateAll();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Liabilities
// ---------------------------------------------------------------------------
export type LiabilityInput = {
  name: string;
  liability_type: LiabilityType;
  direction: DebtDirection;
  balance: number | string;
  currency: string;
  original_principal?: number | string | null;
  interest_rate?: number | string | null;
  term_months?: number | string | null;
  payment_amount?: number | string | null;
  start_date?: string | null;
  asset_id?: string | null;
  notes?: string | null;
};

function optionalAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  return parseAmount(value);
}

function buildLiability(input: LiabilityInput) {
  const name = cleanText(input.name, 120);
  if (!name) return { ok: false as const, error: "Name the debt." };

  const balance = parseAmount(input.balance);
  if (balance == null) return { ok: false as const, error: "Enter the balance." };

  if (!isCurrencyCode(input.currency))
    return { ok: false as const, error: "Pick a currency." };

  const rate = optionalAmount(input.interest_rate);
  if (input.interest_rate && rate == null)
    return { ok: false as const, error: "Enter a valid rate." };

  const term =
    input.term_months == null || input.term_months === ""
      ? null
      : Math.round(Number(String(input.term_months).replace(/[\s,]/g, "")));
  if (input.term_months && (term == null || Number.isNaN(term) || term <= 0))
    return { ok: false as const, error: "Enter a valid term in months." };

  const payment = optionalAmount(input.payment_amount);
  const principal = optionalAmount(input.original_principal);

  if (input.start_date && !isValidDate(input.start_date))
    return { ok: false as const, error: "Pick a valid date." };

  return {
    ok: true as const,
    payload: {
      name,
      liability_type: LIABILITY_TYPES.includes(input.liability_type)
        ? input.liability_type
        : "other",
      direction: DEBT_DIRECTIONS.includes(input.direction)
        ? input.direction
        : "owed_by_me",
      balance,
      currency: input.currency,
      original_principal: principal,
      interest_rate: rate,
      term_months: term,
      payment_amount: payment,
      start_date: input.start_date || null,
      asset_id: input.asset_id ? input.asset_id : null,
      notes: cleanText(input.notes, 1000),
    },
  };
}

export async function createLiability(
  input: LiabilityInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = buildLiability(input);
  if (!built.ok) return built;

  const { error } = await supabase
    .from("liabilities")
    .insert({ ...built.payload, user_id: user.id });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateAll();
  return { ok: true };
}

export async function updateLiability(
  id: string,
  input: LiabilityInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = buildLiability(input);
  if (!built.ok) return built;

  const { error } = await supabase
    .from("liabilities")
    .update(built.payload)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateAll();
  return { ok: true };
}

export async function deleteLiability(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("liabilities")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "That did not delete. Try again." };

  revalidateAll();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Debt payments
//
// The `debt_payment_posting` trigger does the balance moves: the principal pays
// the debt down, the full amount moves the linked account (out for a debt I owe,
// in for money owed to me). This action only validates and inserts the row; the
// interest portion is recorded for reporting and is otherwise just the cost.
// ---------------------------------------------------------------------------
export type DebtPaymentInput = {
  liability_id: string;
  account_id?: string | null;
  amount: number | string;
  principal_amount?: number | string | null;
  interest_amount?: number | string | null;
  paid_on?: string | null;
  note?: string | null;
};

export async function recordDebtPayment(
  input: DebtPaymentInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  if (!input.liability_id) return { ok: false, error: "Pick a debt." };

  // Read the debt server-side: it fixes the payment currency and proves ownership.
  const { data: liability } = await supabase
    .from("liabilities")
    .select("id, currency")
    .eq("id", input.liability_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!liability) return { ok: false, error: "That debt no longer exists." };

  const amount = parseAmount(input.amount);
  if (amount == null || amount <= 0)
    return { ok: false, error: "Enter an amount." };

  // Split the payment. Defaults to all-principal; interest is clamped and the two
  // legs are kept consistent so principal + interest always equals the payment.
  let interest = optionalAmount(input.interest_amount) ?? 0;
  if (interest < 0) interest = 0;
  if (interest > amount) interest = amount;
  let principal = optionalAmount(input.principal_amount);
  if (principal == null) principal = amount - interest;
  if (principal < 0) principal = 0;
  if (principal > amount) principal = amount;
  interest = amount - principal;

  // The posting trigger moves the account by the raw payment with no FX, so the
  // account has to hold the debt's currency or its balance would be corrupted.
  let account_id: string | null = null;
  if (input.account_id) {
    const { data: account } = await supabase
      .from("savings")
      .select("id, currency")
      .eq("id", input.account_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!account) return { ok: false, error: "Pick a valid account." };
    if (account.currency !== liability.currency)
      return { ok: false, error: "Account currency must match the debt." };
    account_id = account.id;
  }

  if (input.paid_on && !isValidDate(input.paid_on))
    return { ok: false, error: "Pick a valid date." };

  const { error } = await supabase.from("debt_payments").insert({
    user_id: user.id,
    liability_id: liability.id,
    account_id,
    amount,
    principal_amount: principal,
    interest_amount: interest,
    currency: liability.currency,
    ...(input.paid_on ? { paid_on: input.paid_on } : {}),
    note: cleanText(input.note, 500),
  });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateWithAccounts();
  return { ok: true };
}

export async function deleteDebtPayment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  // The trigger reverses both legs on delete (and no-ops if the debt is already
  // gone), so removing the row cleanly undoes the payment.
  const { error } = await supabase
    .from("debt_payments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "That did not delete. Try again." };

  revalidateWithAccounts();
  return { ok: true };
}
