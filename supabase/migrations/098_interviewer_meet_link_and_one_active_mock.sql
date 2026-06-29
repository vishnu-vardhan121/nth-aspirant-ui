-- Interviewer: update Meet link on slots / booked mocks (syncs registration).
-- Aspirant: block booking or requesting while a mock is already scheduled or pending.

create or replace function public.update_interviewer_meet_link(
  p_meet_link text,
  p_slot_id uuid default null,
  p_mock_registration_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slot_id uuid;
  v_slot record;
  v_reg record;
  v_link text := nullif(trim(coalesce(p_meet_link, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_slot_id is null and p_mock_registration_id is null then
    return jsonb_build_object('ok', false, 'error', 'Slot or mock registration required');
  end if;

  if p_mock_registration_id is not null then
    select r.id, r.aspirant_id, r.slot_id, r.status, s.interviewer_id
    into v_reg
    from public.mock_registrations r
    left join public.mock_slots s on s.id = r.slot_id
    where r.id = p_mock_registration_id;

    if v_reg.id is null then
      return jsonb_build_object('ok', false, 'error', 'Mock registration not found');
    end if;
    if v_reg.interviewer_id is distinct from v_uid and not public.is_admin() then
      return jsonb_build_object('ok', false, 'error', 'Not authorized');
    end if;
    if v_reg.status not in ('scheduled', 'requested') then
      return jsonb_build_object('ok', false, 'error', 'Meet link can only be updated for scheduled or pending mocks');
    end if;

    v_slot_id := v_reg.slot_id;

    update public.mock_registrations
    set meet_link = v_link
    where id = p_mock_registration_id;

    if v_slot_id is not null then
      update public.mock_slots
      set meet_link = v_link, updated_at = now()
      where id = v_slot_id;
    end if;

    if v_reg.aspirant_id is not null and v_link is not null then
      insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
      values (
        null,
        v_reg.aspirant_id,
        'Your mock interview Meet link has been updated. Open Mocks to join: ' || v_link,
        p_mock_registration_id
      );
    end if;

    return jsonb_build_object('ok', true, 'meet_link', v_link);
  end if;

  select s.id, s.interviewer_id, s.status into v_slot
  from public.mock_slots s
  where s.id = p_slot_id;

  if v_slot.id is null then
    return jsonb_build_object('ok', false, 'error', 'Slot not found');
  end if;
  if v_slot.interviewer_id is distinct from v_uid and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if v_slot.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'Cannot update a cancelled slot');
  end if;

  update public.mock_slots
  set meet_link = v_link, updated_at = now()
  where id = p_slot_id;

  update public.mock_registrations r
  set meet_link = v_link
  where r.slot_id = p_slot_id
    and r.status in ('scheduled', 'requested');

  select r.aspirant_id, r.id into v_reg
  from public.mock_registrations r
  where r.slot_id = p_slot_id
    and r.status in ('scheduled', 'requested')
  limit 1;

  if v_reg.aspirant_id is not null and v_link is not null then
    insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
    values (
      null,
      v_reg.aspirant_id,
      'Your mock interview Meet link has been updated. Open Mocks to join: ' || v_link,
      v_reg.id
    );
  end if;

  return jsonb_build_object('ok', true, 'meet_link', v_link);
end;
$$;

comment on function public.update_interviewer_meet_link(text, uuid, uuid) is
  'Interviewer/admin: set Meet link on slot and linked mock registration; notifies aspirant when booked.';

grant execute on function public.update_interviewer_meet_link(text, uuid, uuid) to authenticated;

-- ========== One active mock at a time (scheduled or pending request) ==========
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

  if exists (
    select 1 from public.mock_registrations r
    where r.aspirant_id = v_uid
      and r.status in ('scheduled', 'requested')
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'You already have a mock scheduled or pending. Complete or cancel it before booking another slot.'
    );
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

  if exists (
    select 1 from public.mock_registrations r
    where r.aspirant_id = v_uid
      and r.status in ('scheduled', 'requested')
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'You already have a mock scheduled or pending. Complete or cancel it before requesting another.'
    );
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
