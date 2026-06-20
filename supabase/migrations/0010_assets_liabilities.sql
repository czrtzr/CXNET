-- CXNET — assets, liabilities, and debt payments
-- The balance sheet beyond cash and investments: tangible assets (property,
-- vehicles), the debts secured against or independent of them (mortgages, loans,
-- credit, money owed either way), and recorded payments that pay a debt down.
-- Net worth becomes accounts + investments + assets + receivables − payables;
-- the long-idle balance_history.liabilities column finally carries a real figure.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.asset_type as enum ('property', 'vehicle', 'other');

create type public.liability_type as enum (
  'mortgage',
  'auto_loan',
  'student_loan',
  'personal_loan',
  'credit_card',
  'owed',
  'other'
);

-- Which way the money flows: a debt I owe (reduces net worth) or money owed to
-- me (a receivable, an asset that adds to net worth).
create type public.debt_direction as enum ('owed_by_me', 'owed_to_me');

-- ---------------------------------------------------------------------------
-- assets — manually valued tangible holdings. value is the current estimate.
-- ---------------------------------------------------------------------------
create table public.assets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  name           text not null,
  asset_type     public.asset_type not null default 'other',
  value          numeric(20, 2) not null default 0,
  currency       public.currency_code not null,
  purchase_price numeric(20, 2),
  purchase_date  date,
  notes          text,
  created_at     timestamptz not null default now()
);

create index idx_assets_user on public.assets (user_id);

-- ---------------------------------------------------------------------------
-- liabilities — debts in either direction. Amortization fields are optional, so
-- a simple "someone owes me $50" and a fully described mortgage share one table.
-- asset_id secures a debt against an asset (mortgage → house) for the equity view.
-- ---------------------------------------------------------------------------
create table public.liabilities (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  name               text not null,
  liability_type     public.liability_type not null default 'other',
  direction          public.debt_direction not null default 'owed_by_me',
  balance            numeric(20, 2) not null default 0,
  currency           public.currency_code not null,
  original_principal numeric(20, 2),
  interest_rate      numeric(7, 4),   -- annual percentage rate, e.g. 5.2500
  term_months        integer,
  payment_amount     numeric(20, 2),  -- scheduled periodic payment
  start_date         date,
  asset_id           uuid references public.assets (id) on delete set null,
  notes              text,
  created_at         timestamptz not null default now()
);

create index idx_liabilities_user  on public.liabilities (user_id);
create index idx_liabilities_asset on public.liabilities (asset_id);

-- ---------------------------------------------------------------------------
-- debt_payments — a payment against a debt. The principal portion reduces the
-- balance; the full amount moves the linked account. Interest is recorded for
-- reporting but is not a balance of its own — it is simply the cost.
-- ---------------------------------------------------------------------------
create table public.debt_payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  liability_id     uuid not null references public.liabilities (id) on delete cascade,
  account_id       uuid references public.savings (id) on delete set null,
  amount           numeric(20, 2) not null,
  principal_amount numeric(20, 2) not null,
  interest_amount  numeric(20, 2) not null default 0,
  currency         public.currency_code not null,
  paid_on          date not null default current_date,
  note             text,
  created_at       timestamptz not null default now()
);

create index idx_debt_payments_user      on public.debt_payments (user_id, paid_on desc);
create index idx_debt_payments_liability on public.debt_payments (liability_id);

-- ---------------------------------------------------------------------------
-- Posting trigger for debt payments. The principal pays the debt down; the full
-- payment moves the account (out for a debt I owe, in for money owed to me). On
-- delete the legs reverse — but only when the debt still exists, so deleting a
-- liability (which cascades its payments) tears down cleanly without trying to
-- refund historical account movements. SECURITY DEFINER, user_id-scoped.
-- ---------------------------------------------------------------------------
create or replace function public.apply_debt_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dir public.debt_direction;
begin
  if tg_op = 'INSERT' then
    select direction into dir from public.liabilities
      where id = new.liability_id and user_id = new.user_id;

    update public.liabilities set balance = balance - new.principal_amount
      where id = new.liability_id and user_id = new.user_id;

    if new.account_id is not null then
      update public.savings
        set balance = balance + (case when dir = 'owed_to_me' then new.amount else -new.amount end)
        where id = new.account_id and user_id = new.user_id;
    end if;
    return new;

  elsif tg_op = 'DELETE' then
    select direction into dir from public.liabilities
      where id = old.liability_id and user_id = old.user_id;
    -- The debt is gone (cascade delete): leave history alone, reverse nothing.
    if not found then
      return old;
    end if;

    update public.liabilities set balance = balance + old.principal_amount
      where id = old.liability_id and user_id = old.user_id;

    if old.account_id is not null then
      update public.savings
        set balance = balance - (case when dir = 'owed_to_me' then old.amount else -old.amount end)
        where id = old.account_id and user_id = old.user_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

create trigger debt_payment_posting
  after insert or delete on public.debt_payments
  for each row execute function public.apply_debt_payment();

-- ---------------------------------------------------------------------------
-- Row Level Security: own your own rows; guests are read only. Same shape as the
-- rest of the per-user financial tables.
-- ---------------------------------------------------------------------------
alter table public.assets        enable row level security;
alter table public.liabilities   enable row level security;
alter table public.debt_payments enable row level security;

create policy "assets: read own" on public.assets for select
  using (user_id = auth.uid());
create policy "assets: insert own" on public.assets for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "assets: update own" on public.assets for update
  using (user_id = auth.uid() and not public.is_guest());
create policy "assets: delete own" on public.assets for delete
  using (user_id = auth.uid() and not public.is_guest());

create policy "liabilities: read own" on public.liabilities for select
  using (user_id = auth.uid());
create policy "liabilities: insert own" on public.liabilities for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "liabilities: update own" on public.liabilities for update
  using (user_id = auth.uid() and not public.is_guest());
create policy "liabilities: delete own" on public.liabilities for delete
  using (user_id = auth.uid() and not public.is_guest());

create policy "debt_payments: read own" on public.debt_payments for select
  using (user_id = auth.uid());
create policy "debt_payments: insert own" on public.debt_payments for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "debt_payments: delete own" on public.debt_payments for delete
  using (user_id = auth.uid() and not public.is_guest());
