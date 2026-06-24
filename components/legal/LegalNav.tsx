"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The three legal documents form one set; this tab strip moves between them and
// marks the one you are reading. Kept client-side only for the active-state read.
const DOCS = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/data", label: "Data & Security" },
] as const;

export function LegalNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-3">
      {DOCS.map((doc) => {
        const active = pathname === doc.href;
        return (
          <Link
            key={doc.href}
            href={doc.href}
            aria-current={active ? "page" : undefined}
            className={`text-xs uppercase tracking-[0.16em] transition ${
              active
                ? "text-text"
                : "text-text-faint hover:text-text-muted"
            }`}
          >
            {doc.label}
          </Link>
        );
      })}
    </nav>
  );
}
