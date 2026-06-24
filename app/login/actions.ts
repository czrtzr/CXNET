"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Sign in is Google only. The allowlist is still enforced in the database (the
// enforce_allowlist trigger fires on every auth.users insert, OAuth included),
// so only invited emails can ever land a session. A refused account is sent
// back to /login with a generic message that does not confirm the allowlist.
export async function signInWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured) {
    redirect("/login?error=config");
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    (headerList.get("host") ? `https://${headerList.get("host")}` : "");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data?.url) {
    redirect("/login?error=oauth");
  }

  // Hand off to Google's consent screen.
  redirect(data.url);
}

// The read-only demo. The "Explore the demo" link signs everyone into one shared
// guest account using credentials kept server-side only (never NEXT_PUBLIC). The
// account's `guest` role makes it read only at the database via RLS, so a visitor
// can look around every screen but change nothing. A failure reads generically.
export async function signInAsGuest(): Promise<void> {
  if (!isSupabaseConfigured) {
    redirect("/login?error=config");
  }

  const email = (process.env.DEMO_EMAIL || "demo@cxnet.app").trim().toLowerCase();
  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    redirect("/login?error=demo");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=demo");
  }

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
