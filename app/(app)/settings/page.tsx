import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionContext } from "@/lib/supabase/session";
import { SettingsView } from "@/components/settings/SettingsView";
import type { McpTokenRow } from "@/components/settings/McpConnectCard";
import type { AccountRef } from "@/types";

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const [{ data: accountData }, { data: tokenData }, headerList] = await Promise.all([
    ctx.supabase.from("savings").select("id, account_name, currency").order("created_at", {
      ascending: false,
    }),
    ctx.supabase
      .from("mcp_tokens")
      .select("id, name, created_at, last_used_at")
      .order("created_at", { ascending: false }),
    headers(),
  ]);
  const accounts = (accountData ?? []) as AccountRef[];

  const mcpTokens: McpTokenRow[] = (tokenData ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
    lastUsedAt: t.last_used_at,
  }));

  // Build the public connector URL from the request, honouring proxy headers so
  // it is correct on both localhost and the deployed origin.
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const connectorUrl = host ? `${proto}://${host}/api/mcp` : "/api/mcp";

  return (
    <SettingsView
      base={ctx.base}
      displayName={ctx.displayName}
      accounts={accounts}
      defaultIncomeAccountId={ctx.defaultIncomeAccountId}
      defaultExpenseAccountId={ctx.defaultExpenseAccountId}
      canWrite={ctx.role !== "guest"}
      mcpTokens={mcpTokens}
      connectorUrl={connectorUrl}
    />
  );
}
