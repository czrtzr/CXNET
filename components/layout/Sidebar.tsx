"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crest } from "@/components/svg/Crest";
import { PRIMARY_NAV } from "./nav";
import { QuietModeToggle } from "./QuietModeToggle";
import { AdminIcon, SettingsIcon, LockIcon } from "@/components/svg/icons";
import { cn } from "@/lib/utils/cn";

type SidebarProps = {
  displayName: string;
  isSuperAdmin: boolean;
  signOut: () => void;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Fixed 220px desktop rail. Hidden on mobile, where the bottom bar takes over.
export function Sidebar({ displayName, isSuperAdmin, signOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[220px] flex-col border-r border-border bg-surface md:flex">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-5 py-5 text-text"
      >
        <Crest size={26} className="text-brass" />
        <span className="font-serif text-lg tracking-tight">CXNET</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {PRIMARY_NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition",
                active
                  ? "bg-surface-raised text-text"
                  : "text-text-muted hover:bg-surface-hover hover:text-text",
              )}
            >
              {active ? (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-red" />
              ) : null}
              <Icon size={18} />
              {label}
            </Link>
          );
        })}

        {isSuperAdmin ? (
          <Link
            href="/admin"
            aria-current={isActive(pathname, "/admin") ? "page" : undefined}
            className={cn(
              "relative mt-1 flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition",
              isActive(pathname, "/admin")
                ? "bg-surface-raised text-text"
                : "text-text-muted hover:bg-surface-hover hover:text-text",
            )}
          >
            {isActive(pathname, "/admin") ? (
              <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-red" />
            ) : null}
            <AdminIcon size={18} />
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <QuietModeToggle />

        <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-xs text-text-muted">{displayName}</span>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              aria-label="Settings"
              className="rounded-sm p-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              <SettingsIcon size={18} />
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Lock and sign out"
                className="rounded-sm p-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text"
              >
                <LockIcon size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
