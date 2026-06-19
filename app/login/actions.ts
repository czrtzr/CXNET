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

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
