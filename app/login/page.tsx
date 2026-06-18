import { LoginForm } from "@/components/auth/LoginForm";

// Full screen, centered. A proper drifting guilloche background and crest land
// in later phases; for now a quiet framed card establishes the aesthetic.
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-deep px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-3xl tracking-tight text-text">CXNET</p>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-text-faint">
            Private wealth
          </p>
        </div>

        <div className="rounded-sm border border-border bg-surface-raised p-7">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
