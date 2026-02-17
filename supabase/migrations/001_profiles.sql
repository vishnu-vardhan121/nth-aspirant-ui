-- Aspirants table (one row per user). Run in Supabase Dashboard → SQL Editor.
-- If you already have "profiles" and want to switch: run 002_aspirants_only.sql after this, or run this alone for a clean aspirants table.

-- 1) Optional: drop old profiles table if you're switching to aspirants only
-- drop table if exists public.profiles cascade;

-- 2) Create aspirants table
create table if not exists public.aspirants (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  city text not null,
  education jsonb not null default '{}',
  skills text[] default '{}',
  resume_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aspirants enable row level security;

-- 3) Drop existing policies if re-running (avoids "policy already exists")
drop policy if exists "aspirants_select_own" on public.aspirants;
drop policy if exists "aspirants_insert_own" on public.aspirants;
drop policy if exists "aspirants_update_own" on public.aspirants;

-- 4) RLS: user can only access their own row (id = auth.uid())
create policy "aspirants_select_own"
  on public.aspirants for select
  using (auth.uid() = id);

create policy "aspirants_insert_own"
  on public.aspirants for insert
  with check (auth.uid() = id);

create policy "aspirants_update_own"
  on public.aspirants for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 5) On insert, force id to current user (so RLS passes even if JWT/context is delayed)
create or replace function public.aspirants_set_id()
returns trigger as $$
begin
  if auth.uid() is not null then
    new.id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists aspirants_set_id_trigger on public.aspirants;
create trigger aspirants_set_id_trigger
  before insert on public.aspirants
  for each row execute function public.aspirants_set_id();

-- 6) updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists aspirants_updated_at on public.aspirants;
create trigger aspirants_updated_at
  before update on public.aspirants
  for each row execute function public.set_updated_at();

comment on table public.aspirants is 'One row per user; id = auth.uid(). Run as authenticated user (JWT required).';
