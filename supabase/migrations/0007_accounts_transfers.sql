-- CXNET - accounts, balance posting, and transfers
-- Income and expenses now post to a cash account's balance (the savings rows are
-- the accounts). Each entry stores the signed delta it applied, in the account's
-- currency, so an edit or delete reverses exactly. Transfers move balance between
-- two accounts and are net-worth-neutral. Balances may go negative: a posting or
-- transfer is never rejected for insufficient funds and never floored at zero.

-- ---------------------------------------------------------------------------
-- Per-kind default accounts on the profile. Income and expense each remember
-- their own default, set in Settings and pre-filled on every new entry.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column default_income_account_id  uuid references public.savings (id) on delete set null,
  add column default_expense_account_id uuid references public.savings (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Account attribution + the applied delta on income and expenses.
-- posted_amount is the signed change booked to the account's balance, in the
-- account's currency (income positive, expense negative). Null when no account
-- is set, in which case nothing posts.
-- ---------------------------------------------------------------------------
alter table public.income
  add column account_id    uuid references public.savings (id) on delete set null,
  add column posted_amount numeric(20, 2);

alter table public.expenses
  add column account_id    uuid references public.savings (id) on delete set null,
  add column posted_amount numeric(20, 2);

create index idx_income_account   on public.income (account_id);
create index idx_expenses_account on public.expenses (account_id);

-- ---------------------------------------------------------------------------
-- transfers - an explicit, audited move of balance between two accounts.
-- Cross-currency is captured honestly with a separate amount on each side, so
-- there is never an ambiguous single figure. A transfer between two cash
-- accounts leaves net worth unchanged.
-- ---------------------------------------------------------------------------
create table public.transfers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  from_account  uuid references public.savings (id) on delete set null,
  to_account    uuid references public.savings (id) on delete set null,
  from_amount   numeric(20, 2) not null,
  from_currency public.currency_code not null,
  to_amount     numeric(20, 2) not null,
  to_currency   public.currency_code not null,
  note          text,
  occurred_at   date not null default current_date,
  created_at    timestamptz not null default now()
);

create index idx_transfers_user on public.transfers (user_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Posting trigger for income and expenses. One function serves both tables:
-- posted_amount already carries the sign, so applying it (and reversing the old
-- value on update or delete) keeps the account balance in lock-step with the
-- rows. SECURITY DEFINER with an explicit user_id match: a row can only ever
-- move its own owner's account, never another user's.
-- ---------------------------------------------------------------------------
create or replace function public.apply_balance_posting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    if old.account_id is not null and old.posted_amount is not null then
      update public.savings
        set balance = balance - old.posted_amount
        where id = old.account_id and user_id = old.user_id;
    end if;
  end if;

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if new.account_id is not null and new.posted_amount is not null then
      update public.savings
        set balance = balance + new.posted_amount
        where id = new.account_id and user_id = new.user_id;
    end if;
    return new;
  end if;

  return old;
end;
$$;

create trigger income_posting
  after insert or update or delete on public.income
  for each row execute function public.apply_balance_posting();

create trigger expense_posting
  after insert or update or delete on public.expenses
  for each row execute function public.apply_balance_posting();

-- ---------------------------------------------------------------------------
-- Posting trigger for transfers. The from side leaves, the to side arrives,
-- each in its own account's currency; a delete unwinds both. Same ownership
-- scoping as the entry postings.
-- ---------------------------------------------------------------------------
create or replace function public.apply_transfer_posting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.from_account is not null then
      update public.savings set balance = balance - new.from_amount
        where id = new.from_account and user_id = new.user_id;
    end if;
    if new.to_account is not null then
      update public.savings set balance = balance + new.to_amount
        where id = new.to_account and user_id = new.user_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.from_account is not null then
      update public.savings set balance = balance + old.from_amount
        where id = old.from_account and user_id = old.user_id;
    end if;
    if old.to_account is not null then
      update public.savings set balance = balance - old.to_amount
        where id = old.to_account and user_id = old.user_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

create trigger transfer_posting
  after insert or delete on public.transfers
  for each row execute function public.apply_transfer_posting();

-- ---------------------------------------------------------------------------
-- Row Level Security for transfers. Same shape as the rest of the per-user
-- financial tables: read and write only your own rows, guests are read only.
-- Delete is allowed so a mistaken transfer can be unwound (the trigger reverses
-- the balances); there is no update path, an edit is a delete and a re-entry.
-- ---------------------------------------------------------------------------
alter table public.transfers enable row level security;

create policy "transfers: read own" on public.transfers for select
  using (user_id = auth.uid());
create policy "transfers: insert own" on public.transfers for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "transfers: delete own" on public.transfers for delete
  using (user_id = auth.uid() and not public.is_guest());
