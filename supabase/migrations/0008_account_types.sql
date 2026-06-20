-- CXNET — account types and investment linkage
-- The savings rows have always been "accounts"; now each carries an explicit
-- type (defaulting to savings, the historical meaning) so chequing, cash,
-- investment, and credit accounts live in the same place. Investments may be
-- linked to an account, so an "investment account" can mirror the live value of
-- the positions held inside it. The mirroring is computed at read time — no
-- stored balance is moved — so a price tick is reflected without a write.

-- ---------------------------------------------------------------------------
-- Account type. 'savings' keeps every existing row reading exactly as before.
-- ---------------------------------------------------------------------------
create type public.account_type as enum (
  'savings',
  'chequing',
  'cash',
  'investment',
  'credit',
  'other'
);

alter table public.savings
  add column account_type public.account_type not null default 'savings';

-- ---------------------------------------------------------------------------
-- Optional link from a position to the account that holds it. on delete set
-- null: removing an account unlinks its positions rather than deleting them, and
-- they simply return to counting on their own. The value mirroring is a read-time
-- concern (live prices), so there is no trigger here.
-- ---------------------------------------------------------------------------
alter table public.investments
  add column account_id uuid references public.savings (id) on delete set null;

create index idx_investments_account on public.investments (account_id);
