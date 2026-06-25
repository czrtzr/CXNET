-- CXNET - atomic investment reconciliation
-- Mirrors reconcile_savings for positions. The tracked value of a position is
-- shares * current_price; "set actual value" books the gap to reconciliations
-- and snaps the position to the actual by pinning a manual price (actual /
-- shares), which also flips the row to manual so the live feed cannot overwrite
-- it. One transaction, ownership and guest checks enforced inside since the
-- function is SECURITY DEFINER and bypasses RLS.

create or replace function public.reconcile_investment(
  p_target uuid,
  p_actual_value numeric,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pos public.investments%rowtype;
  v_tracked numeric;
  v_diff numeric;
begin
  if v_user is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  if public.is_guest() then
    raise exception 'Guests cannot make changes.' using errcode = '42501';
  end if;

  select * into v_pos
  from public.investments
  where id = p_target and user_id = v_user;

  if not found then
    raise exception 'Position not found.' using errcode = '42501';
  end if;

  if v_pos.shares is null or v_pos.shares = 0 then
    raise exception 'Cannot reconcile a position with no shares.' using errcode = '22023';
  end if;

  v_tracked := v_pos.shares * coalesce(v_pos.current_price, 0);
  v_diff := p_actual_value - v_tracked;
  if v_diff = 0 then
    return;
  end if;

  insert into public.reconciliations (
    user_id, target_type, target_id, account_label,
    previous_balance, actual_balance, delta, direction, currency, note
  ) values (
    v_user, 'investment', p_target, coalesce(v_pos.name, v_pos.ticker, 'Position'),
    v_tracked, p_actual_value, abs(v_diff),
    (case when v_diff > 0 then 'gain' else 'shortfall' end)::public.reconciliation_direction,
    v_pos.currency, nullif(btrim(coalesce(p_note, '')), '')
  );

  update public.investments
  set current_price = p_actual_value / v_pos.shares,
      price_is_manual = true,
      price_updated_at = now()
  where id = p_target and user_id = v_user;
end;
$$;

revoke all on function public.reconcile_investment(uuid, numeric, text) from public;
grant execute on function public.reconcile_investment(uuid, numeric, text) to authenticated;
