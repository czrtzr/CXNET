// Shared filtering for the income and expense lists. Filters narrow the rows
// shown in the list; the hero figures and the change view above stay on the full
// set, so the headline never jumps around while you sift the entries below it.

export type EntryFilters = {
  text: string;
  categoryId: string; // "" means any category
  accountId: string; // "" means any account
  from: string; // YYYY-MM-DD, "" means open ended
  to: string; // YYYY-MM-DD, "" means open ended
};

export const EMPTY_FILTERS: EntryFilters = {
  text: "",
  categoryId: "",
  accountId: "",
  from: "",
  to: "",
};

// How many distinct filters are active, for the badge on the Filter toggle. The
// date range counts as one regardless of which end is set.
export function activeFilterCount(f: EntryFilters): number {
  return (
    (f.text.trim() ? 1 : 0) +
    (f.categoryId ? 1 : 0) +
    (f.accountId ? 1 : 0) +
    (f.from || f.to ? 1 : 0)
  );
}

type Filterable = {
  category_id: string | null;
  account_id: string | null;
  date: string;
  notes?: string | null;
};

// Apply the active filters to one row. `text` pulls the searchable label off the
// row (the income source or the expense description), searched together with any
// note. ISO date strings (YYYY-MM-DD) compare correctly with plain string
// comparison, so the range needs no Date parsing.
export function matchesFilters<T extends Filterable>(
  row: T,
  filters: EntryFilters,
  text: (row: T) => string,
): boolean {
  const q = filters.text.trim().toLowerCase();
  if (q) {
    const haystack = `${text(row)} ${row.notes ?? ""}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.categoryId && row.category_id !== filters.categoryId) return false;
  if (filters.accountId && row.account_id !== filters.accountId) return false;
  if (filters.from && row.date < filters.from) return false;
  if (filters.to && row.date > filters.to) return false;
  return true;
}
