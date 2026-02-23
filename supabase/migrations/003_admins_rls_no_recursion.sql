-- Fix infinite recursion in admins RLS: policies must not query admins directly.
-- Use a SECURITY DEFINER function so the check bypasses RLS.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

-- Recreate policies using the helper (no direct select on admins in policy expression)
drop policy if exists "admins_select_own_or_any_admin" on public.admins;
create policy "admins_select_own_or_any_admin"
  on public.admins for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "admins_insert_own_or_by_admin" on public.admins;
create policy "admins_insert_own_or_by_admin"
  on public.admins for insert
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "admins_update_own_or_by_admin" on public.admins;
create policy "admins_update_own_or_by_admin"
  on public.admins for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());
