"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, isValidDate, cleanText } from "@/lib/finance/input";
import { isCurrencyCode } from "@/lib/finance/currencies";
import { getQuote } from "@/lib/finance/yahoo";
import { cleanSymbol } from "@/lib/finance/symbol";
import {
  INVESTMENT_TYPES,
  LIVE_INVESTMENT_TYPES,
  type InvestmentType,
} from "@/types";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type RefreshResult =
  | { ok: true; failed: string[] }
  | { ok: false; error: string };

export type InvestmentInput = {
  ticker: string | null;
  name: string | null;
  shares: number | string;
  purchase_price?: number | string | null;
  current_price?: number | string | null;
  currency: string;
  type: InvestmentType;
  account_id?: string | null;
  purchase_date?: string | null;
  notes?: string | null;
};

const NO_SESSION = "Your session has ended. Sign in again.";
const SAVE_FAILED = "That did not save. Try again.";

type BuiltInvestment = {
  ticker: string | null;
  name: string | null;
  shares: number;
  purchase_price: number | null;
  current_price: number | null;
  currency: string;
  type: InvestmentType;
  account_id: string | null;
  is_live_priced: boolean;
  purchase_date: string | null;
  notes: string | null;
};

function optional(value: unknown): number | null {
  if (value == null || value === "") return null;
  return parseAmount(value);
}

function build(
  input: InvestmentInput,
): { ok: false; error: string } | { ok: true; payload: BuiltInvestment } {
  if (!INVESTMENT_TYPES.includes(input.type))
    return { ok: false, error: "Pick a type." };
  const isLive = LIVE_INVESTMENT_TYPES.includes(input.type);

  const ticker = isLive ? cleanSymbol(input.ticker) : null;
  if (isLive && !ticker) return { ok: false, error: "Enter a valid ticker." };

  const name = cleanText(input.name, 120);
  if (!isLive && !name) return { ok: false, error: "Name the holding." };

  const shares = parseAmount(input.shares);
  if (shares == null || shares < 0)
    return { ok: false, error: "Enter the number of units." };

  if (!isCurrencyCode(input.currency))
    return { ok: false, error: "Pick a currency." };

  if (input.purchase_date && !isValidDate(input.purchase_date))
    return { ok: false, error: "Pick a valid date." };

  return {
    ok: true,
    payload: {
      ticker,
      name: name ?? ticker,
      shares,
      purchase_price: optional(input.purchase_price),
      current_price: optional(input.current_price),
      currency: input.currency,
      type: input.type,
      account_id: input.account_id ? input.account_id : null,
      is_live_priced: isLive,
      purchase_date: input.purchase_date || null,
      notes: cleanText(input.notes, 1000),
    },
  };
}

export async function createInvestment(
  input: InvestmentInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  const { error } = await supabase
    .from("investments")
    .insert({ ...built.payload, user_id: user.id, price_is_manual: false });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/investments");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateInvestment(
  id: string,
  input: InvestmentInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const built = build(input);
  if (!built.ok) return built;

  const { error } = await supabase
    .from("investments")
    .update(built.payload)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/investments");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteInvestment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "That did not delete. Try again." };

  revalidatePath("/investments");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Pull fresh prices for every live, non manual position. Returns the symbols
// that could not be priced so the UI can badge them offline.
export async function refreshPrices(): Promise<RefreshResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { data, error } = await supabase
    .from("investments")
    .select("id, ticker")
    .eq("user_id", user.id)
    .eq("is_live_priced", true)
    .eq("price_is_manual", false);
  if (error) return { ok: false, error: SAVE_FAILED };

  const failed: string[] = [];
  const now = new Date().toISOString();

  await Promise.all(
    (data ?? []).map(async (row) => {
      const symbol = cleanSymbol(row.ticker);
      if (!symbol) return;
      const quote = await getQuote(symbol);
      if (!quote || quote.price == null) {
        failed.push(symbol);
        return;
      }
      await supabase
        .from("investments")
        .update({ current_price: quote.price, price_updated_at: now })
        .eq("id", row.id)
        .eq("user_id", user.id);
    }),
  );

  revalidatePath("/investments");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true, failed };
}

// Pin a price by hand. Flips the position to manual so the live feed leaves it
// alone.
export async function setManualPrice(
  id: string,
  price: number | string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const value = parseAmount(price);
  if (value == null || value < 0) return { ok: false, error: "Enter a price." };

  const { error } = await supabase
    .from("investments")
    .update({
      current_price: value,
      price_is_manual: true,
      price_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/investments");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Hand a position back to the live feed and refetch immediately.
export async function resumeLivePricing(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { data: row } = await supabase
    .from("investments")
    .select("ticker")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const symbol = cleanSymbol(row?.ticker);
  const quote = symbol ? await getQuote(symbol) : null;

  const { error } = await supabase
    .from("investments")
    .update({
      price_is_manual: false,
      current_price: quote?.price ?? undefined,
      price_updated_at: quote?.price != null ? new Date().toISOString() : undefined,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/investments");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Correct a position's total value. Books the gap to reconciliations and pins a
// manual price, atomically, via the RPC.
export async function reconcileInvestment(
  id: string,
  actualValue: number | string,
  note?: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const value = parseAmount(actualValue);
  if (value == null) return { ok: false, error: "Enter the true value." };

  const { error } = await supabase.rpc("reconcile_investment", {
    p_target: id,
    p_actual_value: value,
    p_note: cleanText(note, 500),
  });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath("/investments");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}
