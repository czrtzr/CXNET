"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/finance/input";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NO_SESSION = "Your session has ended. Sign in again.";
const FORBIDDEN = "You are not allowed to do that.";

// Prove the caller is the super admin before any admin write. Every action below
// re-checks this server side, on top of the /admin layout guard and the RLS
// policies, so authorization never rests on the UI alone. Returns the verified
// super admin's id, or an error to bubble straight back to the client.
async function requireSuperAdmin(
  supabase: SupabaseClient,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") return { ok: false, error: FORBIDDEN };

  return { ok: true, userId: user.id };
}

// Put an email on the invitation allowlist. The DB trigger enforce_allowlist
// then permits exactly one account for it at signup. Idempotent: re-inviting an
// existing email reports it plainly rather than erroring.
export async function inviteEmail(rawEmail: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth.ok) return auth;

  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Enter a valid email address." };

  const { error } = await supabase
    .from("allowlist")
    .insert({ email, added_by: auth.userId });
  if (error) {
    // 23505 = unique_violation: the email is already invited.
    if (error.code === "23505")
      return { ok: false, error: "That email is already invited." };
    return { ok: false, error: "Could not add that email. Try again." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

// Remove an email from the allowlist, closing off any future registration for
// it. Existing accounts are untouched (the allowlist gates signup only). The
// super admin's own invite can never be removed.
export async function revokeInvite(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth.ok) return auth;

  // Resolve the email this row carries, then refuse if it belongs to a super
  // admin. Protects the owner's access from being revoked by mistake.
  const { data: row } = await supabase
    .from("allowlist")
    .select("email")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, error: "That invite no longer exists." };

  const { data: owner } = await supabase
    .from("profiles")
    .select("role")
    .eq("email", row.email)
    .maybeSingle();
  if (owner?.role === "super_admin")
    return { ok: false, error: "The administrator cannot be removed." };

  const { error } = await supabase.from("allowlist").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not remove that. Try again." };

  revalidatePath("/admin");
  return { ok: true };
}

// Suspend or restore a member's access. Deactivation flips profiles.is_active;
// the guard_profile_changes trigger lets a super admin make this change. A super
// admin account can never be deactivated, including the caller's own.
export async function setMemberActive(
  userId: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth.ok) return auth;

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (!target) return { ok: false, error: "That member no longer exists." };
  if (target.role === "super_admin")
    return { ok: false, error: "The administrator cannot be suspended." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", userId);
  if (error) return { ok: false, error: "That did not save. Try again." };

  revalidatePath("/admin");
  return { ok: true };
}
