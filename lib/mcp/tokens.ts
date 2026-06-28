import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Personal access tokens for the MCP connector. The plaintext is shown to the
// user exactly once; only the hash is ever stored or compared. The prefix makes
// a leaked token easy to recognize and scan for.
const PREFIX = "cxnet_";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Mint a new token: a long random secret behind the brand prefix, plus its hash
// for storage. The caller persists `hash` and surfaces `token` once.
export function generateToken(): { token: string; hash: string } {
  const token = PREFIX + randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

// Resolve a presented bearer token to the owning user id, or null when it is
// malformed, unknown, or revoked. Runs under the service role (no session on an
// MCP request), so this is the single point that maps a token to an identity;
// every tool then scopes its queries to the returned id. Best-effort touch of
// last_used_at for the user's own visibility.
export async function resolveToken(token: string | undefined): Promise<string | null> {
  if (!token || !token.startsWith(PREFIX)) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("mcp_tokens")
    .select("id, user_id, revoked")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data || data.revoked) return null;

  await admin
    .from("mcp_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.user_id as string;
}
