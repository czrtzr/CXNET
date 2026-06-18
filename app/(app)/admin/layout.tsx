import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Authorization gate for the entire /admin section. The parent (app) layout
// already proved a session exists; here we prove the caller is the super admin.
// Anyone else gets a 404, so the section's existence is not even confirmed.
// This guards every present and future admin sub-page by construction, rather
// than relying on each page to remember the check. RLS remains the real
// backstop on the data itself.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    notFound();
  }

  return <>{children}</>;
}
