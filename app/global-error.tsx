"use client";

import { useEffect } from "react";
import "./globals.css";
import { Crest } from "@/components/svg/Crest";

// Last-resort boundary: catches failures in the root layout itself, so it must
// supply its own <html> and <body> and cannot rely on the next/font variables
// the layout normally sets. globals.css still gives us the tokens and base
// background; the serif falls back to Georgia for the crest and heading.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen">
        <title>Something faulted · CXNET</title>
        <main className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-6 text-center">
          <Crest size={56} className="text-brass" title="CXNET" />
          <h1
            className="mt-8 text-3xl tracking-tight text-text"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Something faulted
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-muted">
            The application failed to start. The issue has been noted. Try again
            in a moment.
          </p>
          {error.digest ? (
            <p className="mt-4 font-mono text-xs text-text-faint">
              Reference {error.digest}
            </p>
          ) : null}
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-transparent bg-red px-4 py-2.5 text-sm font-medium tracking-wide text-text transition hover:bg-red-bright"
            >
              Try again
            </button>
            {/* A hard navigation is intentional here: the root layout failed,
                so a full document reload is the reliable way to recover. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-border px-4 py-2.5 text-sm font-medium tracking-wide text-text transition hover:border-border-strong hover:bg-surface-hover"
            >
              Reload
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
