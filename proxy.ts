import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

// Next 16 renamed the "middleware" convention to "proxy". This runs on every
// matched request before rendering. Its jobs:
//   1. Refresh the Supabase auth session cookie so it never goes stale.
//   2. Gate routes: unauthenticated users are sent to /login, authenticated
//      users are kept out of /login.
// Route protection here is a convenience redirect. Row Level Security in the
// database is the real backstop, never this.

// Paths that never require a session.
const PUBLIC_PATHS = ["/login", "/auth", "/forgot-password"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  // Before the project is configured, do nothing so the app still boots.
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not run any logic between client creation and getUser(): it refreshes
  // the session and must own the cookie writes.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Build a redirect that carries over any session cookies refreshed above, so
  // a token rotation is never lost on the way to the new location.
  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  // Unauthenticated and heading somewhere private: send to login.
  if (!user && !isPublicPath(pathname)) {
    return redirectTo("/login");
  }

  // Authenticated and sitting on the login screen: send to the dashboard.
  if (user && pathname === "/login") {
    return redirectTo("/dashboard");
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static assets, so auth logic
  // never blocks CSS, JS, images, or the favicon from loading.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
