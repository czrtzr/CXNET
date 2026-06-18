import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Allow the app to talk to its own Supabase project (REST + realtime websocket)
// without opening connect-src to the whole internet.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseHttp = "";
let supabaseWs = "";
if (supabaseUrl) {
  try {
    const { host, protocol } = new URL(supabaseUrl);
    supabaseHttp = `${protocol}//${host}`;
    supabaseWs = `${protocol === "https:" ? "wss" : "ws"}://${host}`;
  } catch {
    // Ignore a malformed URL; connect-src simply stays at 'self'.
  }
}

// Content Security Policy. 'unsafe-inline' on scripts/styles covers Next's
// hydration bootstrap; dev additionally needs 'unsafe-eval' and ws: for fast
// refresh. Tightening scripts to a nonce is a Phase 7 hardening task.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${supabaseHttp}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseHttp} ${supabaseWs}${isDev ? " ws: http://localhost:*" : ""}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
