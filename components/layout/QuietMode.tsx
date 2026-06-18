"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// Quiet mode blurs every balance across the app, for glancing at the screen in
// public. It is backed by localStorage and exposed through an external store, so
// every Quietable reads one source of truth and the server snapshot stays false
// (no hydration mismatch). A per account default arrives with Settings later.

const STORAGE_KEY = "cxnet:quiet";
const listeners = new Set<() => void>();

function read(): boolean {
  return (
    typeof window !== "undefined" &&
    window.localStorage.getItem(STORAGE_KEY) === "1"
  );
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // Reflect changes made in other tabs too.
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function toggleQuiet(): void {
  const next = !read();
  window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  for (const l of listeners) l();
}

export function useQuietMode() {
  const quiet = useSyncExternalStore(
    subscribe,
    read,
    () => false, // server snapshot
  );
  return { quiet, toggle: toggleQuiet };
}

// Wrap any sensitive figure so quiet mode can blur it consistently.
export function Quietable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { quiet } = useQuietMode();
  return (
    <span
      className={cn(
        "transition-[filter] duration-200",
        quiet && "select-none blur-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}
