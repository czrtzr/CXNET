-- CXNET — income categories
-- Income gains an optional category, mirroring expenses. Income presets already
-- exist in categories (kind = 'income'); this wires a row to one. Deleting a
-- custom category nulls the reference rather than removing the income entry.

alter table public.income
  add column category_id uuid references public.categories (id) on delete set null;

create index idx_income_category on public.income (category_id);
