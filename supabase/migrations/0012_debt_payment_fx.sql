-- CXNET - cross-currency debt payments
-- A debt payment is denominated in the debt's currency, but the cash account it
-- draws from may hold a different currency. account_amount records how much left
-- (or arrived in) the account, in the account's own currency, so the account
-- balance moves by an honest figure instead of being forced to match the debt.
-- Existing rows have a null account_amount and fall back to the payment amount,
-- preserving their original same-currency behaviour exactly.

alter table public.debt_payments
  add column account_amount numeric(20, 2);

-- Re-define the posting trigger to move the account by account_amount when it is
-- present, falling back to the raw payment amount otherwise. The principal still
-- pays the debt down in the debt's own currency. Same SECURITY DEFINER and
-- user_id scoping as before; only the account-leg figure changes.
create or replace function public.apply_debt_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dir public.debt_direction;
  acct_delta numeric(20, 2);
begin
  if tg_op = 'INSERT' then
    select direction into dir from public.liabilities
      where id = new.liability_id and user_id = new.user_id;

    update public.liabilities set balance = balance - new.principal_amount
      where id = new.liability_id and user_id = new.user_id;

    if new.account_id is not null then
      acct_delta := coalesce(new.account_amount, new.amount);
      update public.savings
        set balance = balance + (case when dir = 'owed_to_me' then acct_delta else -acct_delta end)
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
      acct_delta := coalesce(old.account_amount, old.amount);
      update public.savings
        set balance = balance - (case when dir = 'owed_to_me' then acct_delta else -acct_delta end)
        where id = old.account_id and user_id = old.user_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;
