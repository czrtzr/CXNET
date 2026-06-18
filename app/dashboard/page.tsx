import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signOut } from "@/app/login/actions";

// Phase 1 placeholder. The real dashboard (certificate header, charts) arrives
// later. For now this proves the full auth path: a session is required, and the
// profile read below only succeeds because Row Level Security allows a user to
// read their own row.
export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className="font-serif text-2xl text-text">Not connected yet</p>
          <p className="mt-3 text-sm text-text-muted">
            Add your Supabase keys to .env.local, then restart the app.
          </p>
        </div>
      </main>
    );
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
    .select("email, display_name, role, base_currency")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
            Signed in
          </p>
          <p className="mt-2 font-serif text-2xl text-text">
            {profile?.display_name ?? profile?.email ?? user.email}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-sm border border-border px-3 py-2 text-xs uppercase tracking-wide text-text-muted transition hover:border-border-strong hover:text-text"
          >
            Lock
          </button>
        </form>
      </header>

      <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border">
        <Cell label="Role" value={profile?.role ?? "unknown"} />
        <Cell label="Base currency" value={profile?.base_currency ?? "USD"} />
      </dl>

      <p className="mt-12 text-sm text-text-muted">
        Foundation in place. The ledger fills in as the next phases ship.
      </p>
    </main>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-xs uppercase tracking-[0.18em] text-text-faint">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm text-text">{value}</dd>
    </div>
  );
}
