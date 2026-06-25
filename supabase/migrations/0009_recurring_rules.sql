-- CXNET - recurring rules
-- A rule is a template that generates real income/expense entries on a cadence.
-- Generation happens at read time (a catch-up pass on the money screens), so a
-- rule whose next run has passed materializes concrete, dated entries that post
-- to balances exactly like any manual one - no separate "projected" accounting.
-- The generated entries carry recurring_rule_id back to their rule.

create table public.recurring_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  -- Reuses category_kind ('expense' | 'income') so a rule is one or the other.
  kind        public.category_kind not null,
  label       text not null,
  amount      numeric(20, 2) not null,
  currency    public.currency_code not null,
  account_id  uuid references public.savings (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  -- 'interval' is a reserved word in SQL, so the cadence column is named plainly.
  cadence     public.recurrence_interval not null,
  anchor_date date not null,
  -- The next date an entry is due to be generated. Advances one cadence step at
  -- a time as the generator catches up, so missed periods are filled in order.
  next_run    date not null,
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

create index idx_recurring_rules_user on public.recurring_rules (user_id, next_run);

-- Link a generated entry back to the rule that spawned it. on delete set null:
-- removing a rule leaves the entries it already produced in place as history.
alter table public.income
  add column recurring_rule_id uuid references public.recurring_rules (id) on delete set null;
alter table public.expenses
  add column recurring_rule_id uuid references public.recurring_rules (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Row Level Security: own your own rules; guests are read only.
-- ---------------------------------------------------------------------------
alter table public.recurring_rules enable row level security;

create policy "recurring_rules: read own" on public.recurring_rules for select
  using (user_id = auth.uid());
create policy "recurring_rules: insert own" on public.recurring_rules for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "recurring_rules: update own" on public.recurring_rules for update
  using (user_id = auth.uid() and not public.is_guest());
create policy "recurring_rules: delete own" on public.recurring_rules for delete
  using (user_id = auth.uid() and not public.is_guest());
