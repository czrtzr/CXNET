"use client";

import { useEffect } from "react";
import { Crest } from "@/components/svg/Crest";
import { Button } from "@/components/ui/Button";

// Branded fallback for any uncaught error in a route below the root layout.
// Renders inside the root layout, so the fonts and tokens are present. Root
// layout failures themselves fall through to global-error.tsx.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // The message is generic in production; the digest is the thread to the
    // server logs. Surface it to the console for local debugging.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-6 text-center">
      <Crest size={56} className="text-brass" title="CXNET" />
      <h1 className="mt-8 font-serif text-3xl tracking-tight text-text">
        Something faulted
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-muted">
        A part of the ledger failed to load. The issue has been noted. Try again,
        or return to your dashboard.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-text-faint">
          Reference {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex items-center gap-3">
        <Button onClick={() => unstable_retry()}>Try again</Button>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border px-4 py-2.5 text-sm font-medium tracking-wide text-text transition hover:border-border-strong hover:bg-surface-hover"
        >
          Return to dashboard
        </a>
      </div>
    </main>
  );
}
