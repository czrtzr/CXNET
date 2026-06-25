-- CXNET - atomic savings reconciliation
-- The "set actual balance" flow must book the adjustment and move the balance
-- together or not at all. Doing it as two client calls leaves a window where
-- one lands and the other fails. This function does both in a single
-- transaction. It is SECURITY DEFINER, so it bypasses RLS and must enforce
-- ownership itself: it acts only on a row owned by the caller, and refuses
-- guests, matching the reconciliations and savings policies.

create or replace function public.reconcile_savings(
  p_target uuid,
  p_actual numeric,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_account public.savings%rowtype;
  v_diff numeric;
begin
  if v_user is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  if public.is_guest() then
    raise exception 'Guests cannot make changes.' using errcode = '42501';
  end if;

  select * into v_account
  from public.savings
  where id = p_target and user_id = v_user;

  if not found then
    raise exception 'Account not found.' using errcode = '42501';
  end if;

  v_diff := p_actual - v_account.balance;
  if v_diff = 0 then
    return; -- nothing to book
  end if;

  insert into public.reconciliations (
    user_id, target_type, target_id, account_label,
    previous_balance, actual_balance, delta, direction, currency, note
  ) values (
    v_user, 'savings', p_target, v_account.account_name,
    v_account.balance, p_actual, abs(v_diff),
    (case when v_diff > 0 then 'gain' else 'shortfall' end)::public.reconciliation_direction,
    v_account.currency, nullif(btrim(coalesce(p_note, '')), '')
  );

  update public.savings
  set balance = p_actual
  where id = p_target and user_id = v_user;
end;
$$;

-- Only signed in users may call it; the body handles per row authorization.
revoke all on function public.reconcile_savings(uuid, numeric, text) from public;
grant execute on function public.reconcile_savings(uuid, numeric, text) to authenticated;
