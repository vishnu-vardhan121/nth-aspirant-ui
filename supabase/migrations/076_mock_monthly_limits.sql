-- Mock limits per subscription month (anniversary from plan_started_at), not whole plan period.
-- Count scheduled + completed in the current month window; pending requested does not count.
-- Also fixes Base subscription duration to 1 month (was 3 in 007).

-- ========== 1) Base plan = 1 month validity ==========
create or replace function public.subscription_ends_at(plan_name text, started_at timestamptz)
returns timestamptz
language sql
stable
as $$
  select case plan_name
    when 'base' then started_at + interval '1 month'
    when 'silver' then started_at + interval '3 months'
    when 'gold' then started_at + interval '5 months'
    else started_at
  end;
$$;

comment on function public.subscription_ends_at(text, timestamptz) is
  'Subscription end: base 1mo, silver 3mo, gold 5mo from plan_started_at.';

-- ========== 2) Policy: min days between self-booked mocks ==========
insert into public.site_settings (key, value)
values ('mock_policy', '{"min_days_between_mocks": 15}'::jsonb)
on conflict (key) do nothing;

-- Migrate legacy mock_limits default 3,3,10 -> 2,2,10 (per subscription month)
update public.site_settings
set value = '{"base": 2, "silver": 2, "gold": 10}'::jsonb, updated_at = now()
where key = 'mock_limits'
  and value = '{"base": 3, "silver": 3, "gold": 10}'::jsonb;

insert into public.site_settings (key, value)
values ('mock_limits', '{"base": 2, "silver": 2, "gold": 10}'::jsonb)
on conflict (key) do nothing;

-- ========== 3) Helpers ==========
create or replace function public.get_min_days_between_mocks()
returns int
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_policy jsonb;
  v_days int;
begin
  select value into v_policy from public.site_settings where key = 'mock_policy';
  if v_policy is not null then
    v_days := (v_policy ->> 'min_days_between_mocks')::int;
    if v_days is not null and v_days >= 0 then
      return v_days;
    end if;
  end if;
  return 15;
end;
$$;

create or replace function public.get_mock_month_bounds(
  p_started_at timestamptz,
  p_subscription_ends_at timestamptz
)
returns table(period_start timestamptz, period_end timestamptz)
language plpgsql
stable
as $$
declare
  v_i int := 0;
  v_start timestamptz;
  v_end timestamptz;
  v_sub_end timestamptz;
begin
  if p_started_at is null then
    return;
  end if;

  v_sub_end := coalesce(p_subscription_ends_at, p_started_at + interval '1 month');

  if now() < p_started_at then
    period_start := p_started_at;
    period_end := least(p_started_at + interval '1 month', v_sub_end);
    return next;
    return;
  end if;

  loop
    v_start := p_started_at + make_interval(months => v_i);
    v_end := least(p_started_at + make_interval(months => v_i + 1), v_sub_end);
    if now() >= v_start and now() < v_end then
      period_start := v_start;
      period_end := v_end;
      return next;
      return;
    end if;
    exit when v_end >= v_sub_end;
    v_i := v_i + 1;
    if v_i > 120 then
      exit;
    end if;
  end loop;

  period_start := greatest(v_sub_end - interval '1 month', p_started_at);
  period_end := v_sub_end;
  return next;
end;
$$;

create or replace function public.count_mocks_in_period(
  p_aspirant_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.mock_registrations r
  left join public.mock_slots s on s.id = r.slot_id
  where r.aspirant_id = p_aspirant_id
    and (
      (
        r.status = 'scheduled'
        and coalesce(r.scheduled_at, s.start_at, r.created_at) >= p_period_start
        and coalesce(r.scheduled_at, s.start_at, r.created_at) < p_period_end
      )
      or (
        r.status = 'completed'
        and r.completed_at is not null
        and r.completed_at >= p_period_start
        and r.completed_at < p_period_end
      )
    );
$$;

-- ========== 4) get_mock_limit: per subscription month ==========
create or replace function public.get_mock_limit(plan_name text)
returns int
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_limits jsonb;
  v_val int;
begin
  select value into v_limits from public.site_settings where key = 'mock_limits';
  if v_limits is not null then
    v_val := (v_limits ->> lower(plan_name))::int;
    if v_val is not null then
      return v_val;
    end if;
  end if;
  return case lower(plan_name)
    when 'base' then 2
    when 'silver' then 2
    when 'gold' then 10
    else 0
  end;
end;
$$;

comment on function public.get_mock_limit(text) is
  'Mocks allowed per subscription month (anniversary window from plan_started_at).';

-- ========== 5) get_mock_usage ==========
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
  v_sub_ends timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_limit int;
  v_extra int;
  v_used int;
  v_min_days int;
  v_last_completed timestamptz;
  v_next_book timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  select a.plan, a.plan_started_at, coalesce(a.extra_mock_limit, 0)
  into v_plan, v_started_at, v_extra
  from public.aspirants a
  where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  v_sub_ends := public.subscription_ends_at(v_plan, v_started_at);
  select b.period_start, b.period_end
  into v_period_start, v_period_end
  from public.get_mock_month_bounds(v_started_at, v_sub_ends) b
  limit 1;

  v_limit := public.get_mock_limit(v_plan);
  if v_limit >= 0 then
    v_limit := v_limit + v_extra;
  end if;

  v_used := public.count_mocks_in_period(v_uid, v_period_start, v_period_end);
  v_min_days := public.get_min_days_between_mocks();

  select max(r.completed_at) into v_last_completed
  from public.mock_registrations r
  where r.aspirant_id = v_uid and r.status = 'completed' and r.completed_at is not null;

  if v_last_completed is not null and v_min_days > 0 then
    v_next_book := v_last_completed + (v_min_days || ' days')::interval;
    if now() >= v_next_book then
      v_next_book := null;
    end if;
  end if;

  return jsonb_build_object(
    'used', v_used,
    'limit', v_limit,
    'active', true,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'next_book_after', v_next_book,
    'min_days_between', v_min_days
  );
end;
$$;

-- ========== 6) book_mock_slot ==========
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
  v_sub_ends timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_limit int;
  v_extra int;
  v_used int;
  v_min_days int;
  v_last_completed timestamptz;
  v_next_book timestamptz;
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

  select a.plan, a.plan_started_at, coalesce(a.extra_mock_limit, 0)
  into v_plan, v_started_at, v_extra
  from public.aspirants a
  where a.id = v_uid;

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

  v_sub_ends := public.subscription_ends_at(v_plan, v_started_at);
  select b.period_start, b.period_end
  into v_period_start, v_period_end
  from public.get_mock_month_bounds(v_started_at, v_sub_ends) b
  limit 1;

  v_limit := public.get_mock_limit(v_plan) + v_extra;
  v_used := public.count_mocks_in_period(v_uid, v_period_start, v_period_end);
  if v_limit >= 0 and v_used >= v_limit then
    return jsonb_build_object(
      'ok', false,
      'error', 'You have used your mock allowance for this subscription month (' || v_used || ' / ' || v_limit || '). Your next month starts ' || to_char(v_period_end, 'FMDD Mon YYYY') || '.'
    );
  end if;

  v_min_days := public.get_min_days_between_mocks();
  select max(r.completed_at) into v_last_completed
  from public.mock_registrations r
  where r.aspirant_id = v_uid and r.status = 'completed' and r.completed_at is not null;

  if v_last_completed is not null and v_min_days > 0 then
    v_next_book := v_last_completed + (v_min_days || ' days')::interval;
    if now() < v_next_book then
      return jsonb_build_object(
        'ok', false,
        'error', 'Please wait until ' || to_char(v_next_book, 'FMDD Mon YYYY') || ' before booking your next mock (at least ' || v_min_days || ' days after your last completed mock).'
      );
    end if;
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

-- ========== 7) register_mock ==========
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
  v_sub_ends timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_limit int;
  v_extra int;
  v_used int;
  v_min_days int;
  v_last_completed timestamptz;
  v_next_book timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select a.plan, a.plan_started_at, coalesce(a.extra_mock_limit, 0)
  into v_plan, v_started_at, v_extra
  from public.aspirants a
  where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Choose a plan to register for mocks.');
  end if;

  v_sub_ends := public.subscription_ends_at(v_plan, v_started_at);
  select b.period_start, b.period_end
  into v_period_start, v_period_end
  from public.get_mock_month_bounds(v_started_at, v_sub_ends) b
  limit 1;

  v_limit := public.get_mock_limit(v_plan) + v_extra;
  v_used := public.count_mocks_in_period(v_uid, v_period_start, v_period_end);
  if v_limit >= 0 and v_used >= v_limit then
    return jsonb_build_object(
      'ok', false,
      'error', 'You have used your mock allowance for this subscription month (' || v_used || ' / ' || v_limit || '). Your next month starts ' || to_char(v_period_end, 'FMDD Mon YYYY') || '.'
    );
  end if;

  v_min_days := public.get_min_days_between_mocks();
  select max(r.completed_at) into v_last_completed
  from public.mock_registrations r
  where r.aspirant_id = v_uid and r.status = 'completed' and r.completed_at is not null;

  if v_last_completed is not null and v_min_days > 0 then
    v_next_book := v_last_completed + (v_min_days || ' days')::interval;
    if now() < v_next_book then
      return jsonb_build_object(
        'ok', false,
        'error', 'Please wait until ' || to_char(v_next_book, 'FMDD Mon YYYY') || ' before requesting another mock (at least ' || v_min_days || ' days after your last completed mock).'
      );
    end if;
  end if;

  insert into public.mock_registrations (aspirant_id, status, availability_notes)
  values (v_uid, 'requested', nullif(trim(p_availability_notes), ''));

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 8) Admin users list: show this subscription month ==========
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
          and r.completed_at >= mb.period_start and r.completed_at < mb.period_end
      ),
      'mocks_pending_in_period', (
        select count(*)::int from public.mock_registrations r
        left join public.mock_slots s on s.id = r.slot_id
        where r.aspirant_id = a.id and r.status = 'scheduled'
          and a.plan_started_at is not null and a.plan is not null
          and coalesce(r.scheduled_at, s.start_at, r.created_at) >= mb.period_start
          and coalesce(r.scheduled_at, s.start_at, r.created_at) < mb.period_end
      ),
      'mock_limit', public.get_mock_limit(a.plan) + coalesce(a.extra_mock_limit, 0),
      'extra_mock_limit', coalesce(a.extra_mock_limit, 0),
      'mock_month_start', mb.period_start,
      'mock_month_end', mb.period_end
    ) as row
    from public.aspirants a
    left join lateral public.get_mock_month_bounds(
      a.plan_started_at,
      case when a.plan is not null and a.plan_started_at is not null
        then public.subscription_ends_at(a.plan, a.plan_started_at) else null end
    ) mb on a.plan_started_at is not null
    where (p_plan is null or a.plan = p_plan)
      and (p_track is null or (p_track = 'fresher' and coalesce(a.track, 'fresher') = 'fresher') or (p_track = 'experienced' and a.track = 'experienced'))
    order by a.full_name
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0))
  ) sub;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

comment on function public.get_mock_usage() is
  'Aspirant: mocks used/limit for current subscription month; includes period bounds and next_book_after.';
