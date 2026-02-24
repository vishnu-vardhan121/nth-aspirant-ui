-- One aspirant can book only one slot per interviewer per day (e.g. one slot from a 10–12 round of 5 slots).

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

  select a.plan, a.plan_started_at into v_plan, v_started_at from public.aspirants a where a.id = v_uid;
  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Choose a plan to book mocks.');
  end if;

  -- One slot per aspirant per interviewer per day (e.g. one slot from a 10–12 round of 5 slots)
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
  v_limit := public.get_mock_limit(v_plan);
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
