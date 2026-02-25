-- Admins table: one row per admin user (id = auth.uid()).
-- If no row in aspirants for this user, app fetches from admins and shows admin panel.
-- Run in Supabase Dashboard → SQL Editor (after 001 and 003).

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

comment on column public.admins.created_by is 'Admin user id who created this admin (and triggered auth sign up).';

alter table public.admins enable row level security;

drop policy if exists "admins_select_own" on public.admins;
drop policy if exists "admins_select_own_or_any_admin" on public.admins;
create policy "admins_select_own_or_any_admin"
  on public.admins for select
  using (
    auth.uid() = id
    or exists (select 1 from public.admins a where a.id = auth.uid())
  );

drop policy if exists "admins_insert_own" on public.admins;
drop policy if exists "admins_insert_own_or_by_admin" on public.admins;
create policy "admins_insert_own_or_by_admin"
  on public.admins for insert
  with check (
    auth.uid() = id
    or exists (select 1 from public.admins a where a.id = auth.uid())
  );

drop policy if exists "admins_update_own" on public.admins;
drop policy if exists "admins_update_own_or_by_admin" on public.admins;
create policy "admins_update_own_or_by_admin"
  on public.admins for update
  using (
    auth.uid() = id
    or exists (select 1 from public.admins a where a.id = auth.uid())
  )
  with check (
    auth.uid() = id
    or exists (select 1 from public.admins a where a.id = auth.uid())
  );

-- Trigger: set id = auth.uid() when inserting own row; else keep id (new admin created by existing admin)
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

-- updated_at trigger (reuse set_updated_at from 001 if it exists)
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
