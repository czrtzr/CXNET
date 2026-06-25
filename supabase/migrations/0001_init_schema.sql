-- CXNET - schema
-- Tables, enums, helper functions, and triggers. Row Level Security is enabled
-- and policed in the next migration (0002_rls_policies.sql).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('super_admin', 'user', 'guest');
create type public.income_frequency as enum ('monthly', 'weekly', 'biweekly', 'annual', 'one_time');
create type public.recurrence_interval as enum ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual');
create type public.category_kind as enum ('expense', 'income');
create type public.investment_type as enum ('stock', 'etf', 'crypto', 'bond', 'real_estate', 'other');
create type public.reconciliation_target as enum ('savings', 'cash', 'investment', 'liability', 'other');
create type public.reconciliation_direction as enum ('gain', 'shortfall');

-- ISO 4217 currency code. Three uppercase letters.
create domain public.currency_code as char(3)
  check (value ~ '^[A-Z]{3}$');

-- ---------------------------------------------------------------------------
-- profiles - one row per auth user, created automatically on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  display_name  text,
  role          public.user_role not null default 'user',
  base_currency public.currency_code not null default 'USD',
  avatar_url    text,
  is_active     boolean not null default true,
  has_onboarded boolean not null default false,
  created_at    timestamptz not null default now(),
  last_active_at timestamptz
);

-- ---------------------------------------------------------------------------
-- allowlist - gates registration. An email here may create exactly one account
-- (auth.users enforces email uniqueness, so one account per email is implicit).
-- ---------------------------------------------------------------------------
create table public.allowlist (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null unique,
  added_by             uuid references public.profiles (id) on delete set null,
  welcome_email_sent_at timestamptz,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories - preset rows have user_id null and are readable by everyone.
-- ---------------------------------------------------------------------------
create table public.categories (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name    text not null,
  color   text not null,
  kind    public.category_kind not null default 'expense'
);

-- ---------------------------------------------------------------------------
-- income
-- ---------------------------------------------------------------------------
create table public.income (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  source     text not null,
  amount     numeric(20, 2) not null,
  currency   public.currency_code not null,
  frequency  public.income_frequency not null default 'monthly',
  date       date not null default current_date,
  notes      text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  description  text not null,
  amount       numeric(20, 2) not null,
  currency     public.currency_code not null,
  category_id  uuid references public.categories (id) on delete set null,
  date         date not null default current_date,
  notes        text,
  is_recurring boolean not null default false,
  recurrence   public.recurrence_interval,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- investments
-- price_is_manual: when true the user pinned current_price by hand and the
-- live refresh job skips this row until live pricing is resumed.
-- ---------------------------------------------------------------------------
create table public.investments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  ticker          text,
  name            text,
  shares          numeric(30, 10) not null default 0,
  purchase_price  numeric(20, 8),
  current_price   numeric(20, 8),
  currency        public.currency_code not null,
  type            public.investment_type not null default 'stock',
  is_live_priced  boolean not null default true,
  price_is_manual boolean not null default false,
  purchase_date   date,
  notes           text,
  price_updated_at timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- savings
-- ---------------------------------------------------------------------------
create table public.savings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  account_name text not null,
  balance      numeric(20, 2) not null default 0,
  currency     public.currency_code not null,
  goal_amount  numeric(20, 2),
  apy          numeric(6, 3),
  institution  text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- reconciliations - audit trail of every manual balance set, across any
-- account or position. delta is the miscellaneous difference booked when a
-- tracked value was corrected to the real one.
-- ---------------------------------------------------------------------------
create table public.reconciliations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  target_type      public.reconciliation_target not null,
  target_id        uuid, -- null for the top level cash position
  account_label    text not null,
  previous_balance numeric(20, 2) not null,
  actual_balance   numeric(20, 2) not null,
  delta            numeric(20, 2) not null,
  direction        public.reconciliation_direction not null,
  currency         public.currency_code not null,
  note             text,
  captured_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- balance_history - net worth snapshots in the user's base currency.
-- ---------------------------------------------------------------------------
create table public.balance_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  captured_at timestamptz not null default now(),
  net_worth   numeric(20, 2) not null,
  assets      numeric(20, 2) not null,
  liabilities numeric(20, 2) not null default 0
);

-- ---------------------------------------------------------------------------
-- fx_rates - shared, cached daily conversion table. Not user scoped.
-- ---------------------------------------------------------------------------
create table public.fx_rates (
  base        public.currency_code not null,
  quote       public.currency_code not null,
  rate        numeric(20, 8) not null,
  captured_at timestamptz not null default now(),
  primary key (base, quote)
);

-- ---------------------------------------------------------------------------
-- audit_log - admin actions and auth events.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  target     text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes - every user scoped table gets a user_id index, plus common sorts.
-- ---------------------------------------------------------------------------
create index idx_income_user        on public.income (user_id, date desc);
create index idx_expenses_user      on public.expenses (user_id, date desc);
create index idx_expenses_category  on public.expenses (category_id);
create index idx_categories_user    on public.categories (user_id);
create index idx_investments_user   on public.investments (user_id);
create index idx_savings_user       on public.savings (user_id);
create index idx_reconciliations_user on public.reconciliations (user_id, captured_at desc);
create index idx_balance_history_user on public.balance_history (user_id, captured_at);
create index idx_audit_actor        on public.audit_log (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they read past RLS without recursion).
-- Defined after the tables they read, so the SQL bodies validate cleanly.
-- ---------------------------------------------------------------------------

-- True when the current caller is the seeded super admin. Used by admin
-- policies. SECURITY DEFINER avoids the policy recursing into itself.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- True when the current caller is the read only guest demo account.
create or replace function public.is_guest()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'guest'
  );
$$;

-- ---------------------------------------------------------------------------
-- Trigger: create a profile row whenever a new auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, base_currency)
  values (new.id, new.email, 'user', 'USD');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trigger: enforce the allowlist at the database, the strongest backstop.
-- A signup whose email is not on the allowlist is rejected outright.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowlist where lower(email) = lower(new.email)
  ) then
    raise exception 'This email is not permitted to register.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_allowlist
  before insert on auth.users
  for each row execute function public.enforce_allowlist();

-- ---------------------------------------------------------------------------
-- Trigger: stop privilege escalation. Only a super admin (or a trusted server
-- context where auth.uid() is null, e.g. the service role seed) may change a
-- role or the active flag. Regular users editing their own profile cannot.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
       or new.is_active is distinct from old.is_active)
     and auth.uid() is not null
     and not public.is_super_admin()
  then
    raise exception 'You cannot change role or active status.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_changes();
