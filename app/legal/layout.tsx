import Link from "next/link";
import { Crest } from "@/components/svg/Crest";
import { LegalNav } from "@/components/legal/LegalNav";

// The legal documents live outside the authenticated shell so anyone holding an
// invite can read them before signing in. The chrome stays in the house style:
// the crest, the wordmark, a quiet return link, and the shared document nav.
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen bg-bg-deep px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="flex flex-col items-center text-leather transition hover:text-brass"
            aria-label="CXNET home"
          >
            <Crest size={40} />
            <span className="mt-3 font-serif text-2xl tracking-tight text-text">
              CXNET
            </span>
          </Link>
          <span className="mt-2 text-xs uppercase tracking-[0.22em] text-text-faint">
            Private wealth
          </span>
        </header>

        <div className="mt-10">
          <LegalNav />
        </div>

        <article className="mt-10">{children}</article>

        <footer className="mt-16 border-t border-border pt-6 text-center">
          <Link
            href="/login"
            className="text-xs uppercase tracking-[0.16em] text-text-muted transition hover:text-text"
          >
            Return to sign in
          </Link>
        </footer>
      </div>
    </main>
  );
}
