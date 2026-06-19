"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";

export type SelectMenuOption = { value: string; label: string; hint?: string };

type Props = {
  id?: string;
  label?: string;
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

// Returns true only on the client, so the portal never targets a missing
// document during SSR. Mirrors the Modal's approach (no setState in an effect).
const noopSubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type Pos = { left: number; top: number; width: number; maxH: number; up: boolean };

// A custom select that opens into a portaled, viewport-clamped, height-capped
// listbox, so a long option list (currencies, categories) can never run off the
// bottom of the screen the way a native menu does. Searchable once the list
// grows past a handful of entries. Keeps the native control's chrome and the
// app's leather-and-brass styling.
export function SelectMenu({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  className,
}: Props) {
  const reduce = useReducedMotion();
  const isClient = useIsClient();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);

  const showSearch = options.length > 7;
  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.trim().toLowerCase();
        return (
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q) ||
          (o.hint?.toLowerCase().includes(q) ?? false)
        );
      })
    : options;

  function place() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 10;
    const above = rect.top - 10;
    const up = below < 220 && above > below;
    // A searchable menu needs room to breathe even when its trigger is narrow
    // (the currency control). Clamp the left edge so the wider menu stays on
    // screen horizontally too.
    const width = Math.max(rect.width, showSearch ? 240 : rect.width);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setPos({
      left,
      top: up ? rect.top : rect.bottom + 4,
      width,
      maxH: Math.min(280, Math.max(140, up ? above : below)),
      up,
    });
  }

  function openMenu() {
    place();
    setQuery("");
    const current = Math.max(0, options.findIndex((o) => o.value === value));
    setHighlight(current);
    setOpen(true);
  }

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Focus the right element once open, and keep the menu anchored to the trigger
  // as the page or a scroll container moves beneath it.
  useEffect(() => {
    if (!open) return;
    const focusTarget = showSearch ? inputRef.current : menuRef.current;
    focusTarget?.focus();

    const reposition = () => place();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
    // place/showSearch are stable for a given open cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function moveHighlight(delta: number) {
    if (filtered.length === 0) return;
    const next = (highlight + delta + filtered.length) % filtered.length;
    setHighlight(next);
    menuRef.current
      ?.querySelector(`[data-index="${next}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[highlight];
      if (pick) choose(pick.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label
          htmlFor={id}
          className="text-xs uppercase tracking-[0.18em] text-text-muted"
        >
          {label}
        </label>
      ) : null}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center justify-between gap-2 rounded-sm border border-border bg-surface px-3.5 py-2.5 text-left text-text outline-none transition",
          "focus:border-red-bright",
          open && "border-red-bright",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-text-faint")}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="10"
          height="7"
          viewBox="0 0 10 7"
          fill="none"
          aria-hidden
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="#7a5234"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isClient && open && pos
        ? createPortal(
            <motion.div
              ref={menuRef}
              role="listbox"
              tabIndex={-1}
              onKeyDown={onKeyDown}
              initial={reduce ? false : { opacity: 0, y: pos.up ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.12 }}
              className="fixed z-[200] flex flex-col overflow-hidden rounded-sm border border-border-strong bg-surface-raised shadow-xl outline-none"
              style={{
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxH,
                ...(pos.up
                  ? { bottom: window.innerHeight - pos.top + 4 }
                  : { top: pos.top }),
              }}
            >
              {showSearch ? (
                <div className="shrink-0 border-b border-border p-2">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlight(0);
                    }}
                    onKeyDown={onKeyDown}
                    placeholder="Search"
                    className="w-full rounded-sm border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none transition placeholder:text-text-faint focus:border-red-bright"
                  />
                </div>
              ) : null}

              <div className="overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-text-faint">No matches</p>
                ) : (
                  filtered.map((o, i) => (
                    <button
                      key={o.value || "__none"}
                      type="button"
                      data-index={i}
                      role="option"
                      aria-selected={o.value === value}
                      onClick={() => choose(o.value)}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition",
                        i === highlight ? "bg-surface-hover" : "",
                        o.value === value ? "text-text" : "text-text-muted",
                      )}
                    >
                      <span className="truncate">{o.label}</span>
                      {o.hint ? (
                        <span className="shrink-0 text-xs text-text-faint">
                          {o.hint}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </motion.div>,
            document.body,
          )
        : null}
    </div>
  );
}
