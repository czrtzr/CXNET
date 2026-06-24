// Prose primitives for the legal documents. CXNET carries no typography plugin,
// so the reading rhythm for Terms, Privacy, and Data is defined once here against
// the design tokens: warm serif headings, muted body, hairline rules. Every legal
// page composes these so the three documents read as one set.

import type { ReactNode } from "react";

// A titled section. The number is engraved in brass mono to echo the ledger feel.
export function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  const label = String(index).padStart(2, "0");
  return (
    <section className="mt-12 first:mt-0 scroll-mt-28" id={`s${label}`}>
      <h2 className="flex items-baseline gap-3 font-serif text-xl text-text">
        <span className="font-mono text-xs text-brass" aria-hidden>
          {label}
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

// A body paragraph.
export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-text-muted">{children}</p>;
}

// A bulleted list with hairline-square markers.
export function List({ children }: { children: ReactNode }) {
  return <ul className="space-y-2">{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="relative pl-5 text-sm leading-relaxed text-text-muted">
      <span
        className="absolute left-0 top-[0.55em] h-1 w-1 -translate-y-1/2 bg-brass/70"
        aria-hidden
      />
      {children}
    </li>
  );
}

// Inline emphasis that lifts a term to full text color without shouting.
export function Term({ children }: { children: ReactNode }) {
  return <span className="text-text">{children}</span>;
}
