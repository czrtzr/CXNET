"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "./nav";
import { cn } from "@/lib/utils/cn";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Bottom tab bar, five destinations, mobile only. Sits above content with a
// safe-area inset so it clears the home indicator.
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {PRIMARY_NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-wide transition",
              active ? "text-text" : "text-text-faint",
            )}
          >
            <span className="relative">
              {active ? (
                <span className="absolute -top-2 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-red" />
              ) : null}
              <Icon size={20} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
