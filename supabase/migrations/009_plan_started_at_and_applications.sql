-- Subscription period (plan starts at purchase, ends after validity months) and job applications tracking.
-- Run after 006_aspirants_track_plan.

-- 1) When plan starts: purchase time. When it ends: plan_started_at + 3 or 5 months.
alter table public.aspirants
  add column if not exists plan_started_at timestamptz;

comment on column public.aspirants.plan_started_at is 'When the user subscribed to current plan (purchase time). Period end = plan_started_at + 3 or 5 months by plan.';

-- 2) Applications: one row per aspirant per job (we count per month for limit).
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  aspirant_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(aspirant_id, job_id)
);

comment on table public.applications is 'Job applications by aspirants; used for per-month limit and history.';

alter table public.applications enable row level security;

create policy "applications_select_own"
  on public.applications for select
  using (auth.uid() = aspirant_id);

create policy "applications_insert_own"
  on public.applications for insert
  with check (auth.uid() = aspirant_id);

-- 3) Plan limits in SQL for server-side check (job applications per calendar month)
create or replace function public.get_job_applications_limit(plan_name text)
returns int
language sql
immutable
as $$
  select case plan_name
    when 'base' then 5
    when 'silver' then 20
    when 'gold' then -1
    else 0
  end;
$$;

-- 4) Subscription active: now < plan_started_at + validity months
create or replace function public.subscription_ends_at(plan_name text, started_at timestamptz)
returns timestamptz
language sql
stable
as $$
  select case plan_name
    when 'base' then started_at + interval '3 months'
    when 'silver' then started_at + interval '3 months'
    when 'gold' then started_at + interval '5 months'
    else started_at
  end;
$$;

create or replace function public.is_subscription_active(plan_name text, started_at timestamptz)
returns boolean
language sql
stable
as $$
  select plan_name is not null
    and started_at is not null
    and now() < public.subscription_ends_at(plan_name, started_at);
$$;

-- 5) Record application: check limit (and subscription), then insert. Call as authenticated aspirant.
create or replace function public.record_application(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_limit int;
  v_count int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Please choose a plan.');
  end if;

  v_limit := public.get_job_applications_limit(v_plan);
  if v_limit = 0 then
    return jsonb_build_object('ok', false, 'error', 'Invalid plan');
  end if;

  if v_limit > 0 then
    select count(*) into v_count
    from public.applications
    where aspirant_id = v_uid
      and created_at >= date_trunc('month', now());
    if v_count >= v_limit then
      return jsonb_build_object('ok', false, 'error', 'Application limit reached for this month. Upgrade for more.');
    end if;
  end if;

  insert into public.applications (aspirant_id, job_id)
  values (v_uid, p_job_id)
  on conflict (aspirant_id, job_id) do nothing;

  return jsonb_build_object('ok', true);
exception
  when foreign_key_violation then
    return jsonb_build_object('ok', false, 'error', 'Job not found');
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to record application'));
end;
$$;

-- 6) Get current month application usage for dashboard (used count and limit)
create or replace function public.get_application_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_limit int;
  v_used int;
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  v_limit := public.get_job_applications_limit(v_plan);
  select count(*) into v_used
  from public.applications
  where aspirant_id = v_uid and created_at >= date_trunc('month', now());

  return jsonb_build_object('used', v_used, 'limit', v_limit, 'active', true);
end;
$$;
