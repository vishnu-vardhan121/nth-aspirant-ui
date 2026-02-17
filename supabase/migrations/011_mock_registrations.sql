-- Mock interview registrations: aspirants register within plan limit; admin marks as conducted.
-- Run after 009_plan_started_at_and_applications.

create table if not exists public.mock_registrations (
  id uuid primary key default gen_random_uuid(),
  aspirant_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled'))
);

comment on table public.mock_registrations is 'Mock interview registrations; status completed = conducted by admin.';

alter table public.mock_registrations enable row level security;

create policy "mock_registrations_select_own"
  on public.mock_registrations for select
  using (auth.uid() = aspirant_id);

create policy "mock_registrations_insert_own"
  on public.mock_registrations for insert
  with check (auth.uid() = aspirant_id);

-- Admins can select and update (to mark completed)
create policy "mock_registrations_admin_all"
  on public.mock_registrations for all
  using (public.is_admin())
  with check (public.is_admin());

-- Limit: mocks per subscription period (same as plan validity)
create or replace function public.get_mock_limit(plan_name text)
returns int
language sql
immutable
as $$
  select case plan_name
    when 'base' then 3
    when 'silver' then 3
    when 'gold' then 10
    else 0
  end;
$$;

-- Used = count of scheduled + completed in current subscription period
create or replace function public.get_mock_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_ends_at timestamptz;
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

  v_limit := public.get_mock_limit(v_plan);
  v_ends_at := public.subscription_ends_at(v_plan, v_started_at);

  select count(*) into v_used
  from public.mock_registrations
  where aspirant_id = v_uid
    and status in ('scheduled', 'completed')
    and created_at >= v_started_at
    and created_at < v_ends_at;

  return jsonb_build_object('used', v_used, 'limit', v_limit, 'active', true);
end;
$$;

-- Register for a mock (insert scheduled) if under limit
create or replace function public.register_mock()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_ends_at timestamptz;
  v_limit int;
  v_used int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Choose a plan to register for mocks.');
  end if;

  v_limit := public.get_mock_limit(v_plan);
  v_ends_at := public.subscription_ends_at(v_plan, v_started_at);

  select count(*) into v_used
  from public.mock_registrations
  where aspirant_id = v_uid
    and status in ('scheduled', 'completed')
    and created_at >= v_started_at
    and created_at < v_ends_at;

  if v_limit >= 0 and v_used >= v_limit then
    return jsonb_build_object('ok', false, 'error', 'Mock limit reached for this period. Upgrade for more.');
  end if;

  insert into public.mock_registrations (aspirant_id, status)
  values (v_uid, 'scheduled');

  return jsonb_build_object('ok', true);
end;
$$;

-- Admin: mark a mock registration as completed (conducted)
create or replace function public.mark_mock_completed(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  update public.mock_registrations
  set status = 'completed'
  where id = p_registration_id and status = 'scheduled';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or already completed');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Admin: list all mock registrations with aspirant email and name; and per-aspirant conducted count
create or replace function public.get_admin_mock_registrations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_summary jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('registrations', '[]'::jsonb, 'by_aspirant', '{}'::jsonb);
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_email', a.email,
      'aspirant_name', a.full_name,
      'created_at', r.created_at,
      'status', r.status
    ) order by r.created_at desc
  ) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id;

  select jsonb_object_agg(aspirant_id, conducted_count)
  into v_summary
  from (
    select aspirant_id, count(*)::int as conducted_count
    from public.mock_registrations
    where status = 'completed'
    group by aspirant_id
  ) s;

  return jsonb_build_object(
    'registrations', coalesce(v_rows, '[]'::jsonb),
    'by_aspirant', coalesce(v_summary, '{}'::jsonb)
  );
end;
$$;
