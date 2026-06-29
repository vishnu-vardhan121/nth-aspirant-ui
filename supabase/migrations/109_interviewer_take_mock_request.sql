-- Interviewer self-service: claim open mock requests, schedule, and notify aspirant (less admin work).

create or replace function public.interviewer_claim_mock_request(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_interviewer() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  update public.mock_registrations
  set interviewer_id = v_uid
  where id = p_registration_id
    and status = 'requested'
    and slot_id is null
    and interviewer_id is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not available or already taken');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.interviewer_schedule_own_mock(
  p_registration_id uuid,
  p_scheduled_at timestamptz,
  p_meet_link text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aspirant_id uuid;
  v_link text := nullif(trim(coalesce(p_meet_link, '')), '');
  v_body text;
begin
  if not public.is_interviewer() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if p_scheduled_at is null then
    return jsonb_build_object('ok', false, 'error', 'Date and time required');
  end if;

  update public.mock_registrations
  set status = 'scheduled',
      scheduled_at = p_scheduled_at,
      meet_link = v_link
  where id = p_registration_id
    and interviewer_id = v_uid
    and status in ('requested', 'scheduled')
  returning aspirant_id into v_aspirant_id;

  if v_aspirant_id is null then
    return jsonb_build_object('ok', false, 'error', 'Mock not found or not assigned to you');
  end if;

  v_body := 'Your mock interview is scheduled for '
    || to_char(p_scheduled_at at time zone 'Asia/Kolkata', 'FMDD Mon YYYY, HH12:MI AM');
  if v_link is not null then
    v_body := v_body || '. Join here: ' || v_link;
  end if;
  v_body := v_body || '. Check the Mocks page for details.';

  insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
  values (null, v_aspirant_id, v_body, p_registration_id);

  return jsonb_build_object('ok', true);
end;
$$;

-- Claim (if unassigned) + schedule in one step — primary interviewer workflow.
create or replace function public.interviewer_take_mock_request(
  p_registration_id uuid,
  p_scheduled_at timestamptz,
  p_meet_link text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row record;
  v_claim jsonb;
begin
  if not public.is_interviewer() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if p_scheduled_at is null then
    return jsonb_build_object('ok', false, 'error', 'Date and time required');
  end if;

  select r.id, r.interviewer_id, r.status, r.slot_id
  into v_row
  from public.mock_registrations r
  where r.id = p_registration_id;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'Request not found');
  end if;

  if v_row.status <> 'requested' or v_row.slot_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Not an open mock request');
  end if;

  if v_row.interviewer_id is null then
    v_claim := public.interviewer_claim_mock_request(p_registration_id);
    if not (v_claim ->> 'ok')::boolean then
      return v_claim;
    end if;
  elsif v_row.interviewer_id is distinct from v_uid then
    return jsonb_build_object('ok', false, 'error', 'Already assigned to another interviewer');
  end if;

  return public.interviewer_schedule_own_mock(p_registration_id, p_scheduled_at, p_meet_link);
end;
$$;

comment on function public.interviewer_claim_mock_request(uuid) is
  'Interviewer: assign an unassigned open mock request to self (status stays requested).';

comment on function public.interviewer_schedule_own_mock(uuid, timestamptz, text) is
  'Interviewer: set date/time and Meet link on own mock; notifies aspirant.';

comment on function public.interviewer_take_mock_request(uuid, timestamptz, text) is
  'Interviewer: claim open request if needed, then schedule and notify aspirant.';

grant execute on function public.interviewer_claim_mock_request(uuid) to authenticated;
grant execute on function public.interviewer_schedule_own_mock(uuid, timestamptz, text) to authenticated;
grant execute on function public.interviewer_take_mock_request(uuid, timestamptz, text) to authenticated;
