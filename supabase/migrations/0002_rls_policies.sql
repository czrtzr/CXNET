-- CXNET - Row Level Security
-- RLS is enabled on every table. The governing rule: a user sees and touches
-- only their own rows. Presets (categories.user_id is null) and the shared FX
-- cache are the only cross user reads. Guests are strictly read only. The
-- super admin reaches the admin tables (profiles, allowlist, audit_log) but
-- never another user's financial rows.

-- Turn RLS on everywhere. A table with RLS on and no matching policy denies
-- all access by default, which is the safe baseline.
alter table public.profiles        enable row level security;
alter table public.allowlist       enable row level security;
alter table public.categories      enable row level security;
alter table public.income          enable row level security;
alter table public.expenses        enable row level security;
alter table public.investments     enable row level security;
alter table public.savings         enable row level security;
alter table public.reconciliations enable row level security;
alter table public.balance_history enable row level security;
alter table public.fx_rates        enable row level security;
alter table public.audit_log       enable row level security;

-- ===========================================================================
-- profiles
-- ===========================================================================

-- Read your own profile. The super admin can read every profile (admin panel).
create policy "profiles: read own or super admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_super_admin());

-- Update your own profile, or any profile if super admin. Guests cannot edit.
-- The guard_profile_changes trigger separately blocks role and is_active
-- changes by anyone who is not a super admin, so this cannot grant privilege.
create policy "profiles: update own or super admin"
  on public.profiles for update
  using (
    public.is_super_admin()
    or (id = auth.uid() and not public.is_guest())
  )
  with check (
    public.is_super_admin()
    or (id = auth.uid() and not public.is_guest())
  );

-- No INSERT policy: profiles are created only by the handle_new_user trigger.
-- No DELETE policy: accounts are deactivated, never hard deleted.

-- ===========================================================================
-- allowlist - super admin only, in every direction.
-- ===========================================================================
create policy "allowlist: super admin reads"
  on public.allowlist for select using (public.is_super_admin());
create policy "allowlist: super admin inserts"
  on public.allowlist for insert with check (public.is_super_admin());
create policy "allowlist: super admin updates"
  on public.allowlist for update using (public.is_super_admin());
create policy "allowlist: super admin deletes"
  on public.allowlist for delete using (public.is_super_admin());

-- ===========================================================================
-- categories - own rows plus shared presets (user_id is null).
-- ===========================================================================
create policy "categories: read own and presets"
  on public.categories for select
  using (user_id = auth.uid() or user_id is null);

create policy "categories: insert own"
  on public.categories for insert
  with check (user_id = auth.uid() and not public.is_guest());

-- Only your own custom categories are editable. Presets (null user_id) are not
-- matched by user_id = auth.uid(), so they can never be changed or removed.
create policy "categories: update own"
  on public.categories for update
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid());

create policy "categories: delete own"
  on public.categories for delete
  using (user_id = auth.uid() and not public.is_guest());

-- ===========================================================================
-- Per user financial tables. Identical shape: read/write only your own rows,
-- guests cannot write. Defined one table at a time for clarity.
-- ===========================================================================

-- income
create policy "income: read own" on public.income for select
  using (user_id = auth.uid());
create policy "income: insert own" on public.income for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "income: update own" on public.income for update
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid());
create policy "income: delete own" on public.income for delete
  using (user_id = auth.uid() and not public.is_guest());

-- expenses
create policy "expenses: read own" on public.expenses for select
  using (user_id = auth.uid());
create policy "expenses: insert own" on public.expenses for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "expenses: update own" on public.expenses for update
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid());
create policy "expenses: delete own" on public.expenses for delete
  using (user_id = auth.uid() and not public.is_guest());

-- investments
create policy "investments: read own" on public.investments for select
  using (user_id = auth.uid());
create policy "investments: insert own" on public.investments for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "investments: update own" on public.investments for update
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid());
create policy "investments: delete own" on public.investments for delete
  using (user_id = auth.uid() and not public.is_guest());

-- savings
create policy "savings: read own" on public.savings for select
  using (user_id = auth.uid());
create policy "savings: insert own" on public.savings for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "savings: update own" on public.savings for update
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid());
create policy "savings: delete own" on public.savings for delete
  using (user_id = auth.uid() and not public.is_guest());

-- reconciliations (audit trail: insert and read, no edits or deletes)
create policy "reconciliations: read own" on public.reconciliations for select
  using (user_id = auth.uid());
create policy "reconciliations: insert own" on public.reconciliations for insert
  with check (user_id = auth.uid() and not public.is_guest());

-- balance_history (snapshots: insert and read, no edits or deletes by users)
create policy "balance_history: read own" on public.balance_history for select
  using (user_id = auth.uid());
create policy "balance_history: insert own" on public.balance_history for insert
  with check (user_id = auth.uid() and not public.is_guest());

-- ===========================================================================
-- fx_rates - shared read for any signed in user. Writes happen only through
-- the service role (the cached rate job), which bypasses RLS, so there is no
-- write policy here.
-- ===========================================================================
create policy "fx_rates: authenticated read"
  on public.fx_rates for select
  using (auth.uid() is not null);

-- ===========================================================================
-- audit_log - super admin reads. Writes go through the service role or
-- SECURITY DEFINER functions, so no insert policy is exposed to clients.
-- ===========================================================================
create policy "audit_log: super admin reads"
  on public.audit_log for select
  using (public.is_super_admin());

-- ===========================================================================
-- Keep the super admin un-deletable, even from a trusted service role context.
-- ===========================================================================
create or replace function public.protect_super_admin()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'super_admin' then
    raise exception 'The super admin account cannot be deleted.'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger protect_super_admin_delete
  before delete on public.profiles
  for each row execute function public.protect_super_admin();
