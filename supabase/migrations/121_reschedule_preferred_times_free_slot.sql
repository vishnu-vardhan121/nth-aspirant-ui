-- Reschedule flow:
-- 1) Aspirant requests with preferred date/time → old slot frees immediately; registration → requested (keep interviewer).
-- 2) Interviewer sees pending reschedule on their mocks and schedules a new time.
-- 3) Reject/cancel request → registration cancelled; aspirant must book/request fresh (no restore of old slot).

-- ========== Columns ==========
alter table public.mock_reschedule_requests
  add column if not exists preferred_date date,
  add column if not exists preferred_time text,
  add column if not exists previous_scheduled_at timestamptz,
  add column if not exists previous_slot_id uuid;

comment on table public.mock_reschedule_requests is
  'Aspirant reschedule requests. On submit, old slot is freed and registration returns to requested. Interviewer/admin schedules anew or rejects (aspirant starts fresh).';

-- RLS insert policy previously required status=scheduled; after free-slot the row is requested.
-- Inserts go through security definer RPC, but keep policy aligned for any direct inserts.
drop policy if exists "mock_reschedule_requests_aspirant_insert_own" on public.mock_reschedule_requests;
create policy "mock_reschedule_requests_aspirant_insert_own"
  on public.mock_reschedule_requests for insert
  with check (
    exists (
      select 1 from public.mock_registrations r
      where r.id = mock_registration_id
        and r.aspirant_id = auth.uid()
        and r.status in ('scheduled', 'requested')
    )
  );

-- ========== request_mock_reschedule (aspirant) ==========
drop function if exists public.request_mock_reschedule(uuid, text);

create or replace function public.request_mock_reschedule(
  p_registration_id uuid,
  p_reason text,
  p_preferred_date date,
  p_preferred_time text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reg record;
  v_pref_label text;
  v_body text;
  v_time text := nullif(trim(coalesce(p_preferred_time, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_reason is null or trim(p_reason) = '' then
    return jsonb_build_object('ok', false, 'error', 'Reason is required.');
  end if;
  if p_preferred_date is null then
    return jsonb_build_object('ok', false, 'error', 'Preferred date is required.');
  end if;
  if v_time is null then
    return jsonb_build_object('ok', false, 'error', 'Preferred time is required.');
  end if;

  select r.id, r.aspirant_id, r.status, r.slot_id, r.scheduled_at, r.interviewer_id, r.meet_link
  into v_reg
  from public.mock_registrations r
  where r.id = p_registration_id and r.aspirant_id = v_uid
  for update;

  if v_reg.id is null then
    return jsonb_build_object('ok', false, 'error', 'Registration not found.');
  end if;
  if v_reg.status <> 'scheduled' then
    return jsonb_build_object('ok', false, 'error', 'Only a scheduled mock can be rescheduled.');
  end if;
  if exists (
    select 1 from public.mock_reschedule_requests
    where mock_registration_id = p_registration_id and status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'error', 'You already have a pending reschedule request for this mock.');
  end if;

  -- Free the old slot immediately so others can book it.
  if v_reg.slot_id is not null then
    update public.mock_slots
    set status = 'available', updated_at = now()
    where id = v_reg.slot_id and status = 'booked';
  end if;

  v_pref_label := to_char(p_preferred_date, 'FMDD Mon YYYY') || ' ' || v_time;

  update public.mock_registrations
  set status = 'requested',
      slot_id = null,
      scheduled_at = null,
      meet_link = null,
      availability_notes = 'Reschedule requested. Preferred: ' || v_pref_label
        || '. Reason: ' || trim(p_reason)
  where id = p_registration_id;

  insert into public.mock_reschedule_requests (
    mock_registration_id,
    reason,
    preferred_date,
    preferred_time,
    previous_scheduled_at,
    previous_slot_id
  ) values (
    p_registration_id,
    trim(p_reason),
    p_preferred_date,
    v_time,
    v_reg.scheduled_at,
    v_reg.slot_id
  );

  -- Notify interviewer on the mock chat thread (if assigned).
  if v_reg.interviewer_id is not null then
    v_body :=
      'Reschedule requested.' ||
      E'\nPrevious time: ' || coalesce(to_char(v_reg.scheduled_at, 'FMDD Mon YYYY, HH12:MI AM'), '—') ||
      E'\nPreferred: ' || v_pref_label ||
      E'\nReason: ' || trim(p_reason) ||
      E'\n\nPlease set a new schedule. Do not wait at the old meeting time — the old slot is now free.';

    insert into public.messages (
      from_aspirant_id, to_interviewer_id, to_aspirant_id, mock_registration_id, body
    ) values (
      v_uid, v_reg.interviewer_id, v_uid, p_registration_id, v_body
    );
  end if;

  -- Confirm to aspirant.
  insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
  values (
    null,
    v_uid,
    'Your reschedule request was submitted. Preferred: ' || v_pref_label
      || '. Your previous slot is released. The interviewer will set a new time, or you may need to request again if it cannot be accommodated.',
    p_registration_id
  );

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.request_mock_reschedule(uuid, text, date, text) is
  'Aspirant: request reschedule with preferred date/time; frees old slot immediately; registration → requested.';

grant execute on function public.request_mock_reschedule(uuid, text, date, text) to authenticated;

-- ========== Admin list (include preferred + previous) ==========
create or replace function public.get_admin_mock_reschedule_requests()
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
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', req.id,
      'mock_registration_id', req.mock_registration_id,
      'reason', req.reason,
      'status', req.status,
      'created_at', req.created_at,
      'preferred_date', req.preferred_date,
      'preferred_time', req.preferred_time,
      'previous_scheduled_at', req.previous_scheduled_at,
      'previous_slot_id', req.previous_slot_id,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'scheduled_at', r.scheduled_at,
      'meet_link', r.meet_link,
      'slot_id', r.slot_id,
      'interviewer_id', r.interviewer_id,
      'registration_status', r.status
    ) order by req.created_at asc
  ), '[]'::jsonb) into v_rows
  from public.mock_reschedule_requests req
  join public.mock_registrations r on r.id = req.mock_registration_id
  join public.aspirants a on a.id = r.aspirant_id
  where req.status = 'pending';
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== Interviewer: pending reschedule on own mocks ==========
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
      'aspirant_phone', a.phone,
      'scheduled_at', r.scheduled_at,
      'meet_link', r.meet_link,
      'status', r.status,
      'availability_notes', r.availability_notes,
      'technical_score', r.technical_score,
      'communication_score', r.communication_score,
      'problem_solving_score', r.problem_solving_score,
      'overall_score', r.overall_score,
      'feedback_notes', r.feedback_notes,
      'tech_feedback', r.tech_feedback,
      'role_fit_keys', coalesce(r.role_fit_keys, '{}'::text[]),
      'placement_recommendation', r.placement_recommendation,
      'placement_recommendation_note', r.placement_recommendation_note,
      'communication_admin_note', r.communication_admin_note,
      'feedback_submitted_at', r.feedback_submitted_at,
      'completed_at', r.completed_at,
      'created_at', r.created_at,
      'reschedule_pending', (req.id is not null),
      'reschedule_request_id', req.id,
      'reschedule_reason', req.reason,
      'preferred_date', req.preferred_date,
      'preferred_time', req.preferred_time,
      'previous_scheduled_at', req.previous_scheduled_at
    ) order by
      case when req.id is not null then 0 when r.status = 'requested' then 1 when r.status = 'scheduled' then 2 else 3 end,
      case when nullif(trim(coalesce(p_status, '')), '') = 'scheduled' then r.scheduled_at end asc nulls last,
      coalesce(r.scheduled_at, r.created_at) asc nulls last,
      coalesce(r.completed_at, r.created_at) desc nulls last
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  left join lateral (
    select rr.id, rr.reason, rr.preferred_date, rr.preferred_time, rr.previous_scheduled_at
    from public.mock_reschedule_requests rr
    where rr.mock_registration_id = r.id and rr.status = 'pending'
    order by rr.created_at desc
    limit 1
  ) req on true
  where r.interviewer_id = v_uid
    and (p_status is null or trim(p_status) = '' or r.status = p_status);

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== Reject: cancel registration — aspirant starts fresh ==========
create or replace function public.admin_reject_mock_reschedule(p_request_id uuid, p_message_to_aspirant text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg_id uuid;
  v_aspirant_id uuid;
  v_body text;
begin
  if not public.is_admin() and not public.is_interviewer() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select req.mock_registration_id, r.aspirant_id
  into v_reg_id, v_aspirant_id
  from public.mock_reschedule_requests req
  join public.mock_registrations r on r.id = req.mock_registration_id
  where req.id = p_request_id and req.status = 'pending'
    and (
      public.is_admin()
      or r.interviewer_id = auth.uid()
    );

  if v_reg_id is null then
    return jsonb_build_object('ok', false, 'error', 'Request not found or already reviewed.');
  end if;

  update public.mock_reschedule_requests
  set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;

  -- No restore of old slot — aspirant must book/request again.
  update public.mock_registrations
  set status = 'cancelled',
      slot_id = null,
      scheduled_at = null,
      meet_link = null
  where id = v_reg_id
    and status in ('requested', 'scheduled');

  v_body := coalesce(
    nullif(trim(p_message_to_aspirant), ''),
    'Your reschedule request could not be accommodated. Your previous slot was released. Please book a new slot or request a mock again from the Mocks page.'
  );
  insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
  values (auth.uid(), v_aspirant_id, v_body, v_reg_id);

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.admin_reject_mock_reschedule(uuid, text) is
  'Admin or assigned interviewer: reject reschedule; cancels registration so aspirant starts fresh.';

-- Alias for interviewer UI clarity
create or replace function public.reject_mock_reschedule(p_request_id uuid, p_message_to_aspirant text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_reject_mock_reschedule(p_request_id, p_message_to_aspirant);
end;
$$;

grant execute on function public.reject_mock_reschedule(uuid, text) to authenticated;

-- ========== Approve (admin): mark approved; registration already requested ==========
create or replace function public.admin_approve_mock_reschedule(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  update public.mock_reschedule_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id and status = 'pending';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found or already reviewed.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ========== When interviewer schedules → mark pending reschedule approved ==========
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

  update public.mock_reschedule_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = v_uid
  where mock_registration_id = p_registration_id
    and status = 'pending';

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

grant execute on function public.interviewer_schedule_own_mock(uuid, timestamptz, text) to authenticated;
grant execute on function public.get_interviewer_mocks(text) to authenticated;
grant execute on function public.get_admin_mock_reschedule_requests() to authenticated;
grant execute on function public.admin_reject_mock_reschedule(uuid, text) to authenticated;
grant execute on function public.admin_approve_mock_reschedule(uuid) to authenticated;

-- Keep pending reschedules on assigned list only (not the open request pool).
create or replace function public.get_interviewer_mock_request_queue()
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
      'aspirant_phone', a.phone,
      'availability_notes', r.availability_notes,
      'created_at', r.created_at,
      'interviewer_id', r.interviewer_id,
      'interviewer_name', adm.name,
      'assigned_to_me', r.interviewer_id is not distinct from v_uid
    ) order by r.created_at asc
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  left join public.admins adm on adm.id = r.interviewer_id
  where r.status = 'requested'
    and r.slot_id is null
    and not exists (
      select 1 from public.mock_reschedule_requests rr
      where rr.mock_registration_id = r.id and rr.status = 'pending'
    );

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

comment on function public.get_interviewer_mock_request_queue() is
  'Interviewer: pending mock requests (no slot); excludes pending reschedule (those stay on assigned mocks).';

grant execute on function public.get_interviewer_mock_request_queue() to authenticated;

-- Admin schedule also clears any pending reschedule for that registration.
create or replace function public.admin_schedule_mock(
  p_registration_id uuid,
  p_scheduled_at timestamptz,
  p_meet_link text default null,
  p_admin_notes text default null,
  p_interviewer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select r.status into v_status
  from public.mock_registrations r
  where r.id = p_registration_id;

  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'Registration not found');
  end if;

  if p_interviewer_id is not null
     and not exists (
       select 1 from public.admins where id = p_interviewer_id and role = 'interviewer'
     ) then
    return jsonb_build_object('ok', false, 'error', 'Interviewer not found');
  end if;

  if v_status = 'requested' then
    if p_interviewer_id is null then
      return jsonb_build_object('ok', false, 'error', 'Select an interviewer to assign');
    end if;
    if p_scheduled_at is null then
      return jsonb_build_object('ok', false, 'error', 'Date and time required');
    end if;

    update public.mock_registrations
    set status = 'scheduled',
        scheduled_at = p_scheduled_at,
        meet_link = nullif(trim(p_meet_link), ''),
        admin_notes = nullif(trim(p_admin_notes), ''),
        interviewer_id = p_interviewer_id
    where id = p_registration_id
      and status = 'requested';
  elsif v_status = 'scheduled' then
    update public.mock_registrations
    set scheduled_at = coalesce(p_scheduled_at, scheduled_at),
        meet_link = case
          when p_meet_link is not null then nullif(trim(p_meet_link), '')
          else meet_link
        end,
        admin_notes = case
          when p_admin_notes is not null then nullif(trim(p_admin_notes), '')
          else admin_notes
        end,
        interviewer_id = coalesce(p_interviewer_id, interviewer_id)
    where id = p_registration_id
      and status = 'scheduled';
  else
    return jsonb_build_object('ok', false, 'error', 'Registration cannot be scheduled in its current status');
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Update failed');
  end if;

  update public.mock_reschedule_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where mock_registration_id = p_registration_id
    and status = 'pending';

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_schedule_mock(uuid, timestamptz, text, text, uuid) to authenticated;
