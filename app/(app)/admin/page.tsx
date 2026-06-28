import { createClient } from "@/lib/supabase/server";
import { AdminView, type InviteRow } from "@/components/admin/AdminView";
import type { UserRole } from "@/types";

// The /admin layout has already proven the caller is the super admin, so every
// read here is authorized. We pull only identity fields from profiles: no
// financial table is touched, and RLS would block them cross-user regardless.
export default async function AdminPage() {
  const supabase = await createClient();

  const [{ data: allowlist }, { data: members }] = await Promise.all([
    supabase
      .from("allowlist")
      .select("id, email, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, email, role, is_active, display_name, last_active_at"),
  ]);

  // Index members by lowercased email so each invite can show its join status.
  const byEmail = new Map(
    (members ?? []).map((m) => [m.email.toLowerCase(), m]),
  );

  const invites: InviteRow[] = (allowlist ?? []).map((row) => {
    const member = byEmail.get(row.email.toLowerCase());
    return {
      id: row.id,
      email: row.email,
      invitedAt: row.created_at,
      userId: member?.id ?? null,
      role: (member?.role as UserRole | undefined) ?? null,
      isActive: member ? Boolean(member.is_active) : null,
      displayName: member?.display_name ?? null,
      lastActiveAt: member?.last_active_at ?? null,
    };
  });

  return <AdminView invites={invites} />;
}
