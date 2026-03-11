-- Per-aspirant extra limits for mocks and interviews. Admin can grant extra chances beyond plan limits.
-- Run after 050.

-- ========== 1) Add columns to aspirants ==========
alter table public.aspirants
  add column if not exists extra_mock_limit int not null default 0,
  add column if not exists extra_interview_limit int not null default 0;

comment on column public.aspirants.extra_mock_limit is 'Admin-granted extra mock chances beyond plan limit for this period.';
comment on column public.aspirants.extra_interview_limit is 'Admin-granted extra job applications beyond plan limit for this month.';

-- ========== 2) get_mock_usage: include extra_mock_limit in limit ==========
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
  v_extra int;
  v_used int;
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  select a.plan, a.plan_started_at, coalesce(a.extra_mock_limit, 0) into v_plan, v_started_at, v_extra
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  v_limit := public.get_mock_limit(v_plan);
  if v_limit >= 0 then
    v_limit := v_limit + v_extra;
  end if;
  v_ends_at := public.subscription_ends_at(v_plan, v_started_at);

  select count(*) into v_used
  from public.mock_registrations
  where aspirant_id = v_uid
    and status = 'completed'
    and completed_at is not null
    and completed_at >= v_started_at
    and completed_at < v_ends_at;

  return jsonb_build_object('used', v_used, 'limit', v_limit, 'active', true);
end;
$$;

-- ========== 3) book_mock_slot: include extra_mock_limit ==========
create or replace function public.book_mock_slot(p_slot_id uuid)
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
  v_extra int;
  v_completed int;
  v_slot record;
  v_reg_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select s.id, s.interviewer_id, s.start_at, s.end_at, s.meet_link into v_slot
  from public.mock_slots s
  where s.id = p_slot_id and s.status = 'available' and s.start_at > now();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Slot not available or already passed');
  end if;

  select a.plan, a.plan_started_at, coalesce(a.extra_mock_limit, 0) into v_plan, v_started_at, v_extra
  from public.aspirants a where a.id = v_uid;
  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Choose a plan to book mocks.');
  end if;

  if exists (
    select 1 from public.mock_registrations r
    left join public.mock_slots s2 on s2.id = r.slot_id
    where r.aspirant_id = v_uid
      and r.status in ('scheduled', 'requested')
      and r.interviewer_id = v_slot.interviewer_id
      and (coalesce(r.scheduled_at::date, s2.start_at::date) = (v_slot.start_at::date))
  ) then
    return jsonb_build_object('ok', false, 'error', 'You can book only one slot per interviewer per day. You already have a slot booked for this interviewer on this date.');
  end if;

  v_ends_at := public.subscription_ends_at(v_plan, v_started_at);
  v_limit := public.get_mock_limit(v_plan) + v_extra;
  select count(*) into v_completed from public.mock_registrations
  where aspirant_id = v_uid and status = 'completed'
    and completed_at >= v_started_at and completed_at < v_ends_at;
  if v_limit >= 0 and v_completed >= v_limit then
    return jsonb_build_object('ok', false, 'error', 'Mock limit reached for this period (based on completed mocks).');
  end if;

  update public.mock_slots set status = 'booked', updated_at = now() where id = p_slot_id;

  insert into public.mock_registrations (aspirant_id, slot_id, interviewer_id, status, scheduled_at, meet_link)
  values (v_uid, p_slot_id, v_slot.interviewer_id, 'scheduled', v_slot.start_at, v_slot.meet_link)
  returning id into v_reg_id;

  insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
  values (null, v_uid, 'You booked a mock interview for ' || to_char(v_slot.start_at, 'FMDD Mon YYYY, HH12:MI AM') || '. Check Mocks page for the Meet link.', v_reg_id);

  return jsonb_build_object('ok', true, 'registration_id', v_reg_id);
end;
$$;

-- ========== 4) register_mock: include extra_mock_limit ==========
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
  v_extra int;
  v_completed int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select a.plan, a.plan_started_at, coalesce(a.extra_mock_limit, 0) into v_plan, v_started_at, v_extra
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Choose a plan to register for mocks.');
  end if;

  v_ends_at := public.subscription_ends_at(v_plan, v_started_at);
  v_limit := public.get_mock_limit(v_plan) + v_extra;
  select count(*) into v_completed from public.mock_registrations
  where aspirant_id = v_uid and status = 'completed'
    and completed_at >= v_started_at and completed_at < v_ends_at;
  if v_limit >= 0 and v_completed >= v_limit then
    return jsonb_build_object('ok', false, 'error', 'Mock limit reached for this period (based on completed mocks).');
  end if;

  insert into public.mock_registrations (aspirant_id, status, availability_notes)
  values (v_uid, 'requested', nullif(trim(p_availability_notes), ''));

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 5) record_application: include extra_interview_limit ==========
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
  v_extra int;
  v_count int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select a.plan, a.plan_started_at, coalesce(a.extra_interview_limit, 0) into v_plan, v_started_at, v_extra
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Please choose a plan.');
  end if;

  v_limit := public.get_job_applications_limit(v_plan) + v_extra;
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

-- ========== 6) get_application_usage: include extra_interview_limit ==========
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
  v_extra int;
  v_used int;
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  select a.plan, a.plan_started_at, coalesce(a.extra_interview_limit, 0) into v_plan, v_started_at, v_extra
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  v_limit := public.get_job_applications_limit(v_plan) + v_extra;
  select count(*) into v_used
  from public.applications
  where aspirant_id = v_uid
    and created_at >= date_trunc('month', now())
    and status != 'rejected';

  return jsonb_build_object('used', v_used, 'limit', v_limit, 'active', true);
end;
$$;

-- ========== 7) get_admin_users_list: include effective limits (plan + extra) ==========
create or replace function public.get_admin_users_list(
  p_plan text default null,
  p_track text default null,
  p_limit int default 100,
  p_offset int default 0
)
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

  select jsonb_agg(row order by row->>'full_name')
  into v_rows
  from (
    select jsonb_build_object(
      'id', a.id,
      'full_name', a.full_name,
      'email', a.email,
      'plan', a.plan,
      'track', coalesce(a.track, 'fresher'),
      'plan_started_at', a.plan_started_at,
      'created_at', a.created_at,
      'subscription_ends_at', case when a.plan is not null and a.plan_started_at is not null then public.subscription_ends_at(a.plan, a.plan_started_at) else null end,
      'days_until_expiry', case
        when public.is_subscription_active(a.plan, a.plan_started_at) then
          (public.subscription_ends_at(a.plan, a.plan_started_at)::date - current_date)
        else null
      end,
      'is_active', public.is_subscription_active(a.plan, a.plan_started_at),
      'applications_this_month', (
        select count(*)::int from public.applications app
        where app.aspirant_id = a.id and app.created_at >= date_trunc('month', now()) and coalesce(app.status, 'applied') != 'rejected'
      ),
      'application_limit', public.get_job_applications_limit(a.plan) + coalesce(a.extra_interview_limit, 0),
      'extra_interview_limit', coalesce(a.extra_interview_limit, 0),
      'mocks_conducted_in_period', (
        select count(*)::int from public.mock_registrations r
        where r.aspirant_id = a.id and r.status = 'completed'
          and a.plan_started_at is not null and a.plan is not null
          and r.created_at >= a.plan_started_at
          and r.created_at < public.subscription_ends_at(a.plan, a.plan_started_at)
      ),
      'mocks_pending_in_period', (
        select count(*)::int from public.mock_registrations r
        where r.aspirant_id = a.id and r.status in ('requested', 'scheduled')
          and a.plan_started_at is not null and a.plan is not null
          and r.created_at >= a.plan_started_at
          and r.created_at < public.subscription_ends_at(a.plan, a.plan_started_at)
      ),
      'mock_limit', public.get_mock_limit(a.plan) + coalesce(a.extra_mock_limit, 0),
      'extra_mock_limit', coalesce(a.extra_mock_limit, 0)
    ) as row
    from public.aspirants a
    where (p_plan is null or a.plan = p_plan)
      and (p_track is null or (p_track = 'fresher' and coalesce(a.track, 'fresher') = 'fresher') or (p_track = 'experienced' and a.track = 'experienced'))
    order by a.full_name
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0))
  ) sub;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== 8) admin_set_aspirant_extra_limits: admin sets extra limits per aspirant ==========
create or replace function public.admin_set_aspirant_extra_limits(
  p_aspirant_id uuid,
  p_extra_mock_limit int default null,
  p_extra_interview_limit int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_aspirant_id is null then
    return jsonb_build_object('ok', false, 'error', 'Aspirant ID required');
  end if;

  update public.aspirants
  set
    extra_mock_limit = coalesce(p_extra_mock_limit, extra_mock_limit),
    extra_interview_limit = coalesce(p_extra_interview_limit, extra_interview_limit)
  where id = p_aspirant_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Aspirant not found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.admin_set_aspirant_extra_limits(uuid, int, int) is 'Admin only: set extra mock and interview limits for an aspirant beyond plan limits.';
