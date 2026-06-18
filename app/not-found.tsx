import Link from "next/link";
import { Crest } from "@/components/svg/Crest";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-6 text-center">
      <Crest size={44} className="text-leather" />
      <p className="mt-6 font-serif text-3xl text-text">Nothing here</p>
      <p className="mt-2 text-sm text-text-muted">
        That page is not part of your ledger.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.16em] text-text-muted transition hover:border-border-strong hover:text-text"
      >
        Return to dashboard
      </Link>
    </main>
  );
}
