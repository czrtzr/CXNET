import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth return point. Google sends the user here with a code; we exchange it for
// a session cookie and continue to the dashboard. A refusal (most often the
// allowlist trigger rejecting an uninvited email) or any failure lands back on
// login with a generic message that does not confirm allowlist membership.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (!oauthError && code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=denied`);
}
