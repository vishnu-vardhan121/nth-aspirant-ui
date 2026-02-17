-- Mock availability: student submits timings; application status (rejected = refund limit).
-- Run after 011, 009.

-- ========== 1) Mock: availability notes ==========
alter table public.mock_registrations
  add column if not exists availability_notes text;

comment on column public.mock_registrations.availability_notes is 'Student-provided availability (e.g. Mon–Fri 2–5 PM) for admin to schedule mock.';

-- Register mock with optional availability
create or replace function public.register_mock(p_availability_notes text default null)
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

  insert into public.mock_registrations (aspirant_id, status, availability_notes)
  values (v_uid, 'scheduled', nullif(trim(p_availability_notes), ''));

  return jsonb_build_object('ok', true);
end;
$$;

-- Admin mock list: include availability_notes
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
      'status', r.status,
      'availability_notes', r.availability_notes
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

-- ========== 2) Application status: rejected = slot refunded (not counted toward limit) ==========
alter table public.applications
  add column if not exists status text not null default 'applied' check (status in ('applied', 'shortlisted', 'rejected'));

comment on column public.applications.status is 'applied = counts toward limit; shortlisted = selected for drive; rejected = does not count (limit refunded).';

-- Usage: count only non-rejected applications this month
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
  where aspirant_id = v_uid
    and created_at >= date_trunc('month', now())
    and status != 'rejected';

  return jsonb_build_object('used', v_used, 'limit', v_limit, 'active', true);
end;
$$;

-- record_application: insert with status 'applied' (unchanged behavior, column has default)
-- Limit check in record_application must count only non-rejected
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
      and created_at >= date_trunc('month', now())
      and status != 'rejected';
    if v_count >= v_limit then
      return jsonb_build_object('ok', false, 'error', 'Application limit reached for this month. Upgrade for more.');
    end if;
  end if;

  insert into public.applications (aspirant_id, job_id, status)
  values (v_uid, p_job_id, 'applied')
  on conflict (aspirant_id, job_id) do update set status = 'applied';

  return jsonb_build_object('ok', true);
exception
  when foreign_key_violation then
    return jsonb_build_object('ok', false, 'error', 'Job not found');
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to record application'));
end;
$$;

-- Admin: set application status (shortlisted / rejected). Rejected = slot refunded.
create or replace function public.set_application_status(p_application_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_status not in ('applied', 'shortlisted', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status');
  end if;
  update public.applications
  set status = p_status
  where id = p_application_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Application not found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Admin: list applications for a job (for shortlist/reject)
create or replace function public.get_job_applications(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;
  select jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'aspirant_id', a.aspirant_id,
      'aspirant_email', p.email,
      'aspirant_name', p.full_name,
      'created_at', a.created_at,
      'status', a.status
    ) order by a.created_at desc
  ) into v_rows
  from public.applications a
  join public.aspirants p on p.id = a.aspirant_id
  where a.job_id = p_job_id;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
