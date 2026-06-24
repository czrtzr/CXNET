import Link from "next/link";
import { ParticleField } from "@/components/auth/ParticleField";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { Grain } from "@/components/svg/Grain";

// Generic, non leaking copy. Only the unconfigured case is specific; every auth
// failure reads the same so the allowlist is never confirmed or denied.
function messageFor(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "config") return "The app is not connected to its database yet.";
  if (code === "demo") return "The demo is unavailable right now. Try again.";
  return "We could not sign you in. Try again.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-deep px-6">
      <ParticleField className="absolute inset-0 h-full w-full" />
      <Grain />
      <LoginPanel error={messageFor(error)} />

      <footer className="absolute inset-x-0 bottom-6 z-10 flex justify-center gap-5 text-[0.7rem] uppercase tracking-[0.14em] text-text-faint">
        <Link href="/legal/terms" className="transition hover:text-text-muted">
          Terms
        </Link>
        <Link href="/legal/privacy" className="transition hover:text-text-muted">
          Privacy
        </Link>
        <Link href="/legal/data" className="transition hover:text-text-muted">
          Data &amp; Security
        </Link>
      </footer>
    </main>
  );
}
