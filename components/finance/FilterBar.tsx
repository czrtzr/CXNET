"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Input } from "@/components/ui/Input";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/SelectMenu";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  type EntryFilters,
} from "@/lib/finance/filters";

// A small funnel that fills with brass once any filter is active.
function FunnelGlyph({ active }: { active: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 4h18l-7 8v6l-4 2v-8z" />
    </svg>
  );
}

// Collapsible filter controls for a finance list. The toggle carries a count of
// active filters; opening it reveals search, category, account, and a date
// range. Purely presentational: it owns the open state but lifts every filter
// value to the parent, which holds the rows and applies them.
export function FilterBar({
  filters,
  onChange,
  categoryOptions,
  accountOptions,
  searchPlaceholder,
}: {
  filters: EntryFilters;
  onChange: (next: EntryFilters) => void;
  categoryOptions: SelectMenuOption[];
  accountOptions: SelectMenuOption[];
  searchPlaceholder: string;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);
  const set = (patch: Partial<EntryFilters>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-sm border border-border px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-text-muted transition hover:border-border-strong hover:text-text"
        >
          <span className={count > 0 ? "text-brass" : ""}>
            <FunnelGlyph active={count > 0} />
          </span>
          Filter
          {count > 0 ? (
            <span className="rounded-full bg-brass/20 px-1.5 text-[0.7rem] tabular-nums text-brass">
              {count}
            </span>
          ) : null}
        </button>
        {count > 0 ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-xs text-text-faint transition hover:text-text"
          >
            Clear
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid gap-4 rounded-sm border border-border bg-surface p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  id="filter-search"
                  label="Search"
                  placeholder={searchPlaceholder}
                  value={filters.text}
                  onChange={(e) => set({ text: e.target.value })}
                />
              </div>
              <SelectMenu
                id="filter-category"
                label="Category"
                value={filters.categoryId}
                options={categoryOptions}
                onChange={(v) => set({ categoryId: v })}
              />
              <SelectMenu
                id="filter-account"
                label="Account"
                value={filters.accountId}
                options={accountOptions}
                onChange={(v) => set({ accountId: v })}
              />
              <Input
                id="filter-from"
                type="date"
                label="From"
                className="[color-scheme:dark]"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => set({ from: e.target.value })}
              />
              <Input
                id="filter-to"
                type="date"
                label="To"
                className="[color-scheme:dark]"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => set({ to: e.target.value })}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
