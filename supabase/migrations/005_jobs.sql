-- Jobs table: admins create jobs; aspirants see by track + plan (Base/Silver/Gold).
-- Run after 004_admins, 005_admins_rls_no_recursion, 006_aspirants_track_plan.

-- Plan level for visibility: base=1, silver=2, gold=3 (same for both tracks)
create or replace function public.plan_level(p text)
returns int
language sql
immutable
as $$
  select case when p = 'base' then 1 when p = 'silver' then 2 when p = 'gold' then 3 else 0 end;
$$;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  company_name text not null,
  description text,
  location text,
  job_type text,
  salary_range text,
  audience_track text not null check (audience_track in ('fresher', 'experienced')),
  min_plan text check (min_plan is null or min_plan in ('base', 'silver', 'gold')),
  status text not null default 'open' check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.jobs is 'Jobs created by admins; visible to aspirants by track and min_plan (Base/Silver/Gold).';

alter table public.jobs enable row level security;

-- Admins: full CRUD
drop policy if exists "jobs_admin_all" on public.jobs;
create policy "jobs_admin_all"
  on public.jobs for all
  using (public.is_admin())
  with check (public.is_admin());

-- Aspirants: SELECT only, open jobs where track matches and (no min_plan or user plan >= min_plan)
drop policy if exists "jobs_aspirant_select" on public.jobs;
create policy "jobs_aspirant_select"
  on public.jobs for select
  using (
    status = 'open'
    and exists (
      select 1 from public.aspirants a
      where a.id = auth.uid()
      and a.track = jobs.audience_track
      and (
        jobs.min_plan is null
        or (a.plan is not null and public.plan_level(a.plan) >= public.plan_level(jobs.min_plan))
      )
    )
  );

-- updated_at trigger (reuse set_updated_at)
drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();
