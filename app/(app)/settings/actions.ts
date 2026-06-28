"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCurrencyCode } from "@/lib/finance/currencies";
import { cleanText } from "@/lib/finance/input";
import { generateToken } from "@/lib/mcp/tokens";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type MintTokenResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

export type ExportResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

const NO_SESSION = "Your session has ended. Sign in again.";

// Every table that holds the signed-in user's own records. RLS tags each row
// with its owner and limits reads to the caller, so a plain select returns only
// this user's rows. Global/operational tables (allowlist, fx_rates, audit_log)
// and derived tables (balance_history) are deliberately excluded.
const EXPORT_TABLES = [
  "profiles",
  "savings",
  "income",
  "expenses",
  "investments",
  "assets",
  "liabilities",
  "transfers",
  "debt_payments",
  "recurring_rules",
  "reconciliations",
] as const;

// Gather everything the user owns into one JSON-serializable object for a
// self-serve download. Backs the export promise in the Data & Security notice.
export async function exportData(): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const results = await Promise.all(
    EXPORT_TABLES.map((table) => supabase.from(table).select("*")),
  );

  const tables: Record<string, unknown[]> = {};
  for (let i = 0; i < EXPORT_TABLES.length; i++) {
    const { data, error } = results[i];
    if (error) return { ok: false, error: "Export failed. Try again." };
    tables[EXPORT_TABLES[i]] = data ?? [];
  }

  return {
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      schemaVersion: 12,
      account: { id: user.id, email: user.email },
      tables,
    },
  };
}

// Mint an MCP personal access token. Only the hash is stored; the plaintext is
// returned once for the user to copy into their Claude connector config and is
// never recoverable afterward. RLS blocks guests from inserting.
export async function createMcpToken(name: string): Promise<MintTokenResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const clean = cleanText(name, 60);
  if (!clean) return { ok: false, error: "Name the token." };

  const { token, hash } = generateToken();
  const { error } = await supabase
    .from("mcp_tokens")
    .insert({ user_id: user.id, name: clean, token_hash: hash });
  if (error) return { ok: false, error: "Could not create the token. Try again." };

  revalidatePath("/settings");
  return { ok: true, token };
}

// Permanently delete a token, cutting off any Claude still using it. RLS scopes
// the delete to the caller's own rows.
export async function revokeMcpToken(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { error } = await supabase
    .from("mcp_tokens")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not revoke that. Try again." };

  revalidatePath("/settings");
  return { ok: true };
}

// Set the account's native (base) currency. Every screen totals and converts
// against this, so a successful change purges the whole client cache and the
// app re-reads with the new base on the next view.
export async function updateBaseCurrency(code: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  if (!isCurrencyCode(code)) return { ok: false, error: "Pick a currency." };

  // The guard_profile_changes trigger only blocks role and active changes, so a
  // base_currency update on your own row passes; guests are stopped by RLS.
  const { error } = await supabase
    .from("profiles")
    .update({ base_currency: code })
    .eq("id", user.id);
  if (error) return { ok: false, error: "That did not save. Try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

// Set the accounts each new income and expense pre-fills. A null clears a
// default. Ids that are not the caller's own account are rejected, so a stray id
// cannot point a default at someone else's row.
export async function updateDefaultAccounts(
  incomeAccountId: string | null,
  expenseAccountId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const wanted = [incomeAccountId, expenseAccountId].filter(
    (id): id is string => id != null,
  );
  if (wanted.length > 0) {
    const { data: owned } = await supabase
      .from("savings")
      .select("id")
      .in("id", wanted);
    const ownedIds = new Set((owned ?? []).map((r) => r.id));
    if (wanted.some((id) => !ownedIds.has(id)))
      return { ok: false, error: "Pick an account you own." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      default_income_account_id: incomeAccountId,
      default_expense_account_id: expenseAccountId,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "That did not save. Try again." };

  revalidatePath("/income");
  revalidatePath("/expenses");
  revalidatePath("/settings");
  return { ok: true };
}
