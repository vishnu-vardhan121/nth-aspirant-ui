-- 1) Admins table: one row per admin user (id = auth.uid()).
-- Used for admin login and is_admin() checks (e.g. pricing leads RLS).

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'admin',
  type text,
  email text not null,
  contact text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admins is 'Admin users; id = auth.uid() for each admin.';

alter table public.admins enable row level security;

-- 2) Helper so RLS policies do not recurse (security definer bypasses RLS).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

-- 3) RLS: admins can select/insert/update (own row or any row if already admin).
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

-- 4) Trigger: set id = auth.uid() on insert when inserting own row.
create or replace function public.admins_set_id()
returns trigger as $$
begin
  if auth.uid() is not null and (new.id is null or new.id = auth.uid()) then
    new.id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists admins_set_id_trigger on public.admins;
create trigger admins_set_id_trigger
  before insert on public.admins
  for each row execute function public.admins_set_id();

-- 5) updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists admins_updated_at on public.admins;
create trigger admins_updated_at
  before update on public.admins
  for each row execute function public.set_updated_at();
