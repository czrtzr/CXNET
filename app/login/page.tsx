import { LoginForm } from "@/components/auth/LoginForm";
import { Crest } from "@/components/svg/Crest";
import { Guilloche } from "@/components/svg/Guilloche";
import { Grain } from "@/components/svg/Grain";

// Full screen, centered, over a slowly drifting guilloche field. The crest sits
// above a quiet framed card.
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-deep px-6">
      {/* Drifting engraving, low and warm, well behind the card. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-leather/70">
        <Guilloche size={900} opacity={0.07} rings={9} drift />
      </div>
      <Grain />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Crest size={52} className="text-brass" title="CXNET" />
          <p className="mt-4 font-serif text-3xl tracking-tight text-text">
            CXNET
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-text-faint">
            Private wealth
          </p>
        </div>

        <div className="rounded-sm border border-border bg-surface-raised/90 p-7 backdrop-blur">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
