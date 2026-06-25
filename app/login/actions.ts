"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// The fixed identity behind the read-only demo. It is just an internal handle,
// never a real inbox: no mail is ever sent to it and it carries no password.
const DEMO_EMAIL = (process.env.DEMO_EMAIL || "demo@cxnet.app").trim().toLowerCase();

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

// The read-only demo. The "Explore the demo" link drops everyone into one shared
// guest account with a single click. There is no demo password to manage: the
// service role mints a one-time magic-link token server-side and the request's
// own client redeems it immediately, so a session is established without ever
// sending mail or asking for credentials. The account's `guest` role makes it
// read only at the database via RLS, so a visitor can look around every screen
// but change nothing. Any failure reads generically.
export async function signInAsGuest(): Promise<void> {
  if (!isSupabaseConfigured) {
    redirect("/login?error=config");
  }

  // Mint a single-use token for the demo identity using the service role. The
  // token never leaves the server: it is generated and redeemed in this action.
  // Note: redirect() throws internally, so it must stay out of the try/catch or
  // the catch would swallow it. We only collect the token here, then act below.
  let tokenHash: string | undefined;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: DEMO_EMAIL,
    });
    if (!error) tokenHash = data.properties?.hashed_token;
  } catch {
    // Fall through to the generic failure below.
  }
  if (!tokenHash) {
    redirect("/login?error=demo");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
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
