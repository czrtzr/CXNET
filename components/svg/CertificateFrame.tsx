// An engraved certificate frame with filigree corners. Wraps content that
// should read like the header of a share certificate: the net-worth hero, the
// admission greeting. Thin leather and brass hairlines on near-black.

import type { ReactNode } from "react";

export function CertificateFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Double hairline border */}
      <div className="pointer-events-none absolute inset-0 rounded-sm border border-leather/40" />
      <div className="pointer-events-none absolute inset-[5px] rounded-sm border border-brass/20" />

      {/* Filigree corners */}
      <Corner className="left-1.5 top-1.5" />
      <Corner className="right-1.5 top-1.5 rotate-90" />
      <Corner className="bottom-1.5 right-1.5 rotate-180" />
      <Corner className="bottom-1.5 left-1.5 -rotate-90" />

      <div className="relative px-8 py-7">{children}</div>
    </div>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden
      className={`absolute text-brass/45 ${className}`}
    >
      <path
        d="M1 14 V4 a3 3 0 0 1 3 -3 H14"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M4 9 V6 a2 2 0 0 1 2 -2 H9" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
      <circle cx="4" cy="4" r="1" fill="currentColor" />
    </svg>
  );
}
