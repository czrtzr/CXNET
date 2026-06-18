// One consistent thin-stroke icon family. No mixing icon libraries anywhere.
// Every icon is a 24 grid, 1.5 stroke, round caps, and inherits currentColor.

import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
    </Base>
  );
}

export function IncomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 20h14" />
    </Base>
  );
}

export function ExpensesIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 20V10" />
      <path d="M8 14l4-4 4 4" />
      <path d="M5 4h14" />
    </Base>
  );
}

export function InvestmentsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 19h16" />
      <path d="M4 16l5-6 4 3 6-8" />
      <path d="M19 5h-4" />
      <path d="M19 5v4" />
    </Base>
  );
}

export function SavingsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="15" cy="12" r="2.5" />
      <path d="M3 9h5" />
    </Base>
  );
}

export function AdminIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </Base>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </Base>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Base>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="2.5" />
    </Base>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.3 3.9" />
      <path d="M6.3 6.8A17 17 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 4-.9" />
      <path d="M9.9 9.9a2.5 2.5 0 0 0 3.4 3.4" />
    </Base>
  );
}
