import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Server side Supabase client for Server Components, Server Actions, and Route
// Handlers. Next 16 makes cookies() async, so this helper is async too.
// Always create a fresh client per request; never cache it across requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll was called from a Server Component, where cookies are read
          // only. Safe to ignore: the proxy refreshes the session cookie on
          // every request, so the session stays current regardless.
        }
      },
    },
  });
}
