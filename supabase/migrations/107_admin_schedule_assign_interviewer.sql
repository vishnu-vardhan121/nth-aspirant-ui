-- Admin schedules mock requests with a required interviewer assignment so the interviewer sees the mock.

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

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.admin_schedule_mock(uuid, timestamptz, text, text, uuid) is
  'Admin: schedule a requested mock (requires interviewer) or edit a scheduled mock (time, link, interviewer).';

-- Assign an interviewer to a pending request without scheduling yet (shows in interviewer My Mocks).
create or replace function public.admin_assign_mock_interviewer(
  p_registration_id uuid,
  p_interviewer_id uuid
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

  if p_interviewer_id is null then
    return jsonb_build_object('ok', false, 'error', 'Interviewer required');
  end if;

  if not exists (
    select 1 from public.admins where id = p_interviewer_id and role = 'interviewer'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Interviewer not found');
  end if;

  update public.mock_registrations
  set interviewer_id = p_interviewer_id
  where id = p_registration_id
    and status in ('requested', 'scheduled');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or cannot assign interviewer');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.admin_assign_mock_interviewer(uuid, uuid) is
  'Admin: assign a mock request to an interviewer before or after scheduling.';

grant execute on function public.admin_assign_mock_interviewer(uuid, uuid) to authenticated;

-- Interviewer list: include availability notes; sort assigned requests before completed history.
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
      'feedback_submitted_at', r.feedback_submitted_at,
      'completed_at', r.completed_at,
      'created_at', r.created_at
    ) order by
      case r.status when 'requested' then 0 when 'scheduled' then 1 else 2 end,
      case when nullif(trim(coalesce(p_status, '')), '') = 'scheduled' then r.scheduled_at end asc nulls last,
      coalesce(r.scheduled_at, r.created_at) asc nulls last,
      coalesce(r.completed_at, r.created_at) desc nulls last
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  where r.interviewer_id = v_uid
    and (p_status is null or trim(p_status) = '' or r.status = p_status);

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

comment on function public.get_interviewer_mocks(text) is
  'Interviewer: mocks assigned to this user (requested, scheduled, completed).';

-- All pending no-slot requests — visible to every interviewer (with assignment info).
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
    and r.slot_id is null;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

comment on function public.get_interviewer_mock_request_queue() is
  'Interviewer: all pending mock requests (no slot); includes who admin assigned.';

grant execute on function public.get_interviewer_mock_request_queue() to authenticated;
grant execute on function public.admin_schedule_mock(uuid, timestamptz, text, text, uuid) to authenticated;
