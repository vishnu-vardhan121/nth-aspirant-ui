-- Mock slots RPCs: create slots, get available, book, reschedule, cancel, interviewer list, submit feedback.
-- Run after 027. Uses get_mock_limit (029 will make it configurable).

-- ========== Admin: create slots ==========
create or replace function public.create_mock_slots(
  p_interviewer_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_slot_duration_mins int default 25,
  p_meet_link text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t timestamptz := p_start_at;
  v_end timestamptz;
  v_dur interval := (p_slot_duration_mins || ' minutes')::interval;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_end_at is null or p_start_at is null or p_end_at <= p_start_at then
    return jsonb_build_object('ok', false, 'error', 'Invalid time window');
  end if;
  if p_slot_duration_mins is null or p_slot_duration_mins < 15 or p_slot_duration_mins > 60 then
    return jsonb_build_object('ok', false, 'error', 'Slot duration must be 15-60 minutes');
  end if;
  if not exists (select 1 from public.interviewers where id = p_interviewer_id) then
    return jsonb_build_object('ok', false, 'error', 'Interviewer not found');
  end if;

  while v_t + v_dur <= p_end_at loop
    v_end := v_t + v_dur;
    insert into public.mock_slots (interviewer_id, start_at, end_at, status, meet_link)
    values (p_interviewer_id, v_t, v_end, 'available', nullif(trim(p_meet_link), ''))
    on conflict (interviewer_id, start_at) do nothing;
    v_t := v_end;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== Aspirant: get available slots ==========
create or replace function public.get_available_mock_slots(p_from_date date default null, p_to_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := coalesce(p_from_date, current_date);
  v_to date := coalesce(p_to_date, current_date + 14);
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'start_at', s.start_at,
      'end_at', s.end_at,
      'interviewer_name', i.name,
      'meet_link', s.meet_link
    ) order by s.start_at
  ), '[]'::jsonb) into v_rows
  from public.mock_slots s
  join public.interviewers i on i.id = s.interviewer_id
  where s.status = 'available'
    and s.start_at >= now()
    and s.start_at::date >= v_from
    and s.start_at::date <= v_to;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== Aspirant: book a slot ==========
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
  v_used int;
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

  select a.plan, a.plan_started_at into v_plan, v_started_at from public.aspirants a where a.id = v_uid;
  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Choose a plan to book mocks.');
  end if;

  v_limit := public.get_mock_limit(v_plan);
  v_ends_at := public.subscription_ends_at(v_plan, v_started_at);
  select count(*) into v_used from public.mock_registrations
  where aspirant_id = v_uid and status in ('requested', 'scheduled', 'completed')
    and created_at >= v_started_at and created_at < v_ends_at;
  if v_limit >= 0 and v_used >= v_limit then
    return jsonb_build_object('ok', false, 'error', 'Mock limit reached for this period.');
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

-- ========== Reschedule slot (admin or slot's interviewer) ==========
create or replace function public.reschedule_mock_slot(
  p_slot_id uuid,
  p_new_start_at timestamptz,
  p_new_end_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot record;
  v_aspirant_id uuid;
  v_reg_id uuid;
begin
  if not public.is_admin() and not (exists (select 1 from public.mock_slots where id = p_slot_id and interviewer_id = auth.uid())) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select s.id, s.interviewer_id, s.status into v_slot from public.mock_slots s where s.id = p_slot_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Slot not found');
  end if;
  if p_new_end_at <= p_new_start_at then
    return jsonb_build_object('ok', false, 'error', 'Invalid new time window');
  end if;

  if v_slot.status = 'booked' then
    select r.aspirant_id, r.id into v_aspirant_id, v_reg_id from public.mock_registrations r where r.slot_id = p_slot_id and r.status = 'scheduled' limit 1;
    update public.mock_registrations set scheduled_at = p_new_start_at, meet_link = (select meet_link from public.mock_slots where id = p_slot_id) where slot_id = p_slot_id;
  end if;

  update public.mock_slots set start_at = p_new_start_at, end_at = p_new_end_at, updated_at = now() where id = p_slot_id;

  if v_aspirant_id is not null then
    insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
    values (null, v_aspirant_id, 'Your mock interview has been rescheduled to ' || to_char(p_new_start_at, 'FMDD Mon YYYY, HH12:MI AM') || '. Check Messages / Mocks for the link.', v_reg_id);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== Cancel slot (admin or slot's interviewer) ==========
create or replace function public.cancel_mock_slot(p_slot_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aspirant_id uuid;
  v_reg_id uuid;
  v_start_at timestamptz;
begin
  if not public.is_admin() and not (exists (select 1 from public.mock_slots where id = p_slot_id and interviewer_id = auth.uid())) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select r.aspirant_id, r.id, s.start_at into v_aspirant_id, v_reg_id, v_start_at
  from public.mock_slots s
  left join public.mock_registrations r on r.slot_id = s.id and r.status = 'scheduled'
  where s.id = p_slot_id;

  update public.mock_slots set status = 'cancelled', updated_at = now() where id = p_slot_id;
  update public.mock_registrations set status = 'cancelled' where slot_id = p_slot_id and status = 'scheduled';

  if v_aspirant_id is not null then
    insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
    values (null, v_aspirant_id, 'Your mock interview on ' || to_char(v_start_at, 'FMDD Mon YYYY') || ' has been cancelled. You can book another slot from the Mocks page.', v_reg_id);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== Interviewer: list own slots ==========
create or replace function public.get_interviewer_mock_slots(p_from date default null, p_to date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := coalesce(p_from, current_date);
  v_to date := coalesce(p_to, current_date + 7);
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if not public.is_interviewer() then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'start_at', s.start_at,
      'end_at', s.end_at,
      'status', s.status,
      'meet_link', s.meet_link,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email
    ) order by s.start_at
  ), '[]'::jsonb) into v_rows
  from public.mock_slots s
  left join public.mock_registrations r on r.slot_id = s.id and r.status = 'scheduled'
  left join public.aspirants a on a.id = r.aspirant_id
  where s.interviewer_id = v_uid
    and s.start_at::date >= v_from
    and s.start_at::date <= v_to;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== Interviewer: list own mocks (applications) ==========
create or replace function public.get_interviewer_mocks(p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if not public.is_interviewer() then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'scheduled_at', r.scheduled_at,
      'meet_link', r.meet_link,
      'status', r.status,
      'technical_score', r.technical_score,
      'communication_score', r.communication_score,
      'problem_solving_score', r.problem_solving_score,
      'overall_score', r.overall_score,
      'feedback_notes', r.feedback_notes,
      'feedback_submitted_at', r.feedback_submitted_at,
      'completed_at', r.completed_at
    ) order by r.scheduled_at asc nulls last, r.created_at desc
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  where r.interviewer_id = v_uid
    and (p_status is null or r.status = p_status);
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== Interviewer (or admin): submit feedback and mark completed ==========
create or replace function public.submit_mock_feedback(
  p_registration_id uuid,
  p_technical_score int,
  p_communication_score int,
  p_problem_solving_score int,
  p_overall_score int,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aspirant_id uuid;
begin
  if not public.is_admin() and not exists (select 1 from public.mock_registrations where id = p_registration_id and interviewer_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_technical_score is null or p_technical_score < 0 or p_technical_score > 10 or
     p_communication_score is null or p_communication_score < 0 or p_communication_score > 10 or
     p_problem_solving_score is null or p_problem_solving_score < 0 or p_problem_solving_score > 10 or
     p_overall_score is null or p_overall_score < 0 or p_overall_score > 10 then
    return jsonb_build_object('ok', false, 'error', 'All scores must be 0-10');
  end if;

  select aspirant_id into v_aspirant_id from public.mock_registrations where id = p_registration_id and status = 'scheduled';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or already completed');
  end if;

  update public.mock_registrations
  set technical_score = p_technical_score,
      communication_score = p_communication_score,
      problem_solving_score = p_problem_solving_score,
      overall_score = p_overall_score,
      feedback_notes = nullif(trim(p_notes), ''),
      feedback_submitted_at = now(),
      status = 'completed',
      completed_at = now()
  where id = p_registration_id;

  insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
  values (null, v_aspirant_id, 'Your mock interview feedback is ready. Check the Mocks page to view your scores.', p_registration_id);

  return jsonb_build_object('ok', true);
end;
$$;
