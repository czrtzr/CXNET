"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Result shape returned to the client form for inline error display.
export type AuthState = { error: string | null };

// Generic, non leaking copy. Never reveal whether an email exists or is on the
// allowlist. Mirrors the security rule against account enumeration.
const GENERIC_SIGNIN_ERROR = "Those credentials did not match.";
const GENERIC_SIGNUP_ERROR = "That email cannot register right now.";

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "The app is not connected to its database yet." };
  }

  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: GENERIC_SIGNIN_ERROR };
  }

  redirect("/dashboard");
}

// Registration for an allowlisted email. The allowlist is enforced in the
// database (a trigger rejects a signup whose email is not allowlisted), so a
// non allowlisted address fails here without us leaking that fact.
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "The app is not connected to its database yet." };
  }

  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Enter your email and a password." };
  }
  if (password.length < 8) {
    return { error: "Use at least eight characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: GENERIC_SIGNUP_ERROR };
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
