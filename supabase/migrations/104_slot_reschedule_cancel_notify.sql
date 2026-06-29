-- Slot reschedule/cancel: always notify aspirant with full details + reason; attribute sender.

create or replace function public.notify_aspirant_mock_slot_message(
  p_aspirant_id uuid,
  p_registration_id uuid,
  p_body text,
  p_slot_interviewer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if p_aspirant_id is null or p_registration_id is null or p_body is null or trim(p_body) = '' then
    return;
  end if;

  insert into public.messages (
    from_admin_id,
    from_interviewer_id,
    to_aspirant_id,
    body,
    mock_registration_id
  ) values (
    case when v_uid is not null and v_uid = p_slot_interviewer_id then null else v_uid end,
    case when v_uid is not null and v_uid = p_slot_interviewer_id then v_uid else null end,
    p_aspirant_id,
    trim(p_body),
    p_registration_id
  );
end;
$$;

comment on function public.notify_aspirant_mock_slot_message(uuid, uuid, text, uuid) is
  'Insert a mock slot change notice; attributes interviewer vs admin sender.';

create or replace function public.reschedule_mock_slot(
  p_slot_id uuid,
  p_new_start_at timestamptz,
  p_new_end_at timestamptz,
  p_reason text default null
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
  v_old_start timestamptz;
  v_meet_link text;
  v_body text;
begin
  if not public.is_admin() and not (
    exists (select 1 from public.mock_slots where id = p_slot_id and interviewer_id = auth.uid())
  ) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select s.id, s.interviewer_id, s.status, s.start_at, s.meet_link
  into v_slot
  from public.mock_slots s
  where s.id = p_slot_id;

  if v_slot.id is null then
    return jsonb_build_object('ok', false, 'error', 'Slot not found');
  end if;
  if p_new_end_at <= p_new_start_at then
    return jsonb_build_object('ok', false, 'error', 'Invalid new time window');
  end if;

  v_old_start := v_slot.start_at;
  v_meet_link := v_slot.meet_link;

  if v_slot.status = 'booked' then
    select r.aspirant_id, r.id
    into v_aspirant_id, v_reg_id
    from public.mock_registrations r
    where r.slot_id = p_slot_id and r.status = 'scheduled'
    limit 1;

    update public.mock_registrations
    set scheduled_at = p_new_start_at,
        meet_link = coalesce(v_meet_link, meet_link)
    where slot_id = p_slot_id and status = 'scheduled';
  end if;

  update public.mock_slots
  set start_at = p_new_start_at,
      end_at = p_new_end_at,
      updated_at = now()
  where id = p_slot_id;

  if v_aspirant_id is not null then
    v_body :=
      'Your mock interview has been rescheduled.' ||
      E'\n\nPrevious time: ' || to_char(v_old_start, 'FMDD Mon YYYY, HH12:MI AM') ||
      E'\nNew time: ' || to_char(p_new_start_at, 'FMDD Mon YYYY, HH12:MI AM');

    if v_meet_link is not null and trim(v_meet_link) <> '' then
      v_body := v_body || E'\n\nJoin: ' || trim(v_meet_link);
    end if;

    if p_reason is not null and trim(p_reason) <> '' then
      v_body := v_body || E'\n\nReason: ' || trim(p_reason);
    end if;

    v_body := v_body || E'\n\nOpen the Mocks page or Messages for updates.';

    perform public.notify_aspirant_mock_slot_message(
      v_aspirant_id, v_reg_id, v_body, v_slot.interviewer_id
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.cancel_mock_slot(
  p_slot_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aspirant_id uuid;
  v_reg_id uuid;
  v_start_at timestamptz;
  v_interviewer_id uuid;
  v_body text;
begin
  if not public.is_admin() and not (
    exists (select 1 from public.mock_slots where id = p_slot_id and interviewer_id = auth.uid())
  ) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select r.aspirant_id, r.id, s.start_at, s.interviewer_id
  into v_aspirant_id, v_reg_id, v_start_at, v_interviewer_id
  from public.mock_slots s
  left join public.mock_registrations r on r.slot_id = s.id and r.status = 'scheduled'
  where s.id = p_slot_id;

  update public.mock_slots
  set status = 'cancelled', updated_at = now()
  where id = p_slot_id;

  update public.mock_registrations
  set status = 'cancelled'
  where slot_id = p_slot_id and status = 'scheduled';

  if v_aspirant_id is not null then
    v_body :=
      'Your mock interview on ' ||
      to_char(v_start_at, 'FMDD Mon YYYY, HH12:MI AM') ||
      ' has been cancelled. You can book another slot from the Mocks page.';

    if p_reason is not null and trim(p_reason) <> '' then
      v_body := v_body || E'\n\nReason: ' || trim(p_reason);
    end if;

    v_body := v_body || E'\n\nOpen the Mocks page or Messages for details.';

    perform public.notify_aspirant_mock_slot_message(
      v_aspirant_id, v_reg_id, v_body, v_interviewer_id
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.notify_aspirant_mock_slot_message(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.reschedule_mock_slot(uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.cancel_mock_slot(uuid, text) to authenticated;
