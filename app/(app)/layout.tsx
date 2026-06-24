import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signOut } from "@/app/login/actions";
import { AppShell } from "@/components/layout/AppShell";

// Layout for every signed in page. Guards the session once here, fetches the
// profile for the chrome, and wraps children in the app shell. The proxy also
// guards these routes, and RLS guards the data; this is the third layer.
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isSupabaseConfigured) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, role")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? profile?.email ?? user.email ?? "";
  const isSuperAdmin = profile?.role === "super_admin";
  const isGuest = profile?.role === "guest";

  return (
    <AppShell
      displayName={displayName}
      isSuperAdmin={isSuperAdmin}
      isGuest={isGuest}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
