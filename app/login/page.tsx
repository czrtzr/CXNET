import { ParticleField } from "@/components/auth/ParticleField";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { Grain } from "@/components/svg/Grain";

// Generic, non leaking copy. Only the unconfigured case is specific; every auth
// failure reads the same so the allowlist is never confirmed or denied.
function messageFor(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "config") return "The app is not connected to its database yet.";
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
    </main>
  );
}
