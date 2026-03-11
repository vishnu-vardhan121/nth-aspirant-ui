-- When admin "creates" slots at times that already exist (e.g. previously cancelled),
-- ON CONFLICT DO NOTHING left those rows cancelled. Now we re-open them: on conflict
-- update cancelled (or available) rows to available and refresh end_at/meet_link.
-- Do not touch rows that are already booked.

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
  if not exists (select 1 from public.admins where id = p_interviewer_id and role = 'interviewer') then
    return jsonb_build_object('ok', false, 'error', 'Interviewer not found');
  end if;

  while v_t + v_dur <= p_end_at loop
    v_end := v_t + v_dur;
    insert into public.mock_slots (interviewer_id, start_at, end_at, status, meet_link)
    values (p_interviewer_id, v_t, v_end, 'available', nullif(trim(p_meet_link), ''))
    on conflict (interviewer_id, start_at) do update set
      end_at = EXCLUDED.end_at,
      status = 'available',
      meet_link = coalesce(nullif(trim(EXCLUDED.meet_link), ''), mock_slots.meet_link),
      updated_at = now()
    where mock_slots.status in ('cancelled', 'available');
    v_t := v_end;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;
