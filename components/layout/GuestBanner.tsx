import { EyeIcon } from "@/components/svg/icons";

// Shown across the top of every screen while the read-only demo account is in
// use. It states plainly that nothing can be changed and offers the way out:
// signing out returns to the login screen where a real account can sign in.
export function GuestBanner({ signOut }: { signOut: () => void }) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-surface-raised/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-2 md:px-8">
        <p className="flex items-center gap-2 text-xs text-text-muted">
          <EyeIcon size={14} className="text-brass" />
          <span>
            <span className="text-text">Read-only demo.</span> Sign in for your
            own ledger.
          </span>
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="shrink-0 rounded-sm border border-border px-3 py-1 text-[0.7rem] uppercase tracking-[0.14em] text-text-muted transition hover:border-border-strong hover:text-text"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
