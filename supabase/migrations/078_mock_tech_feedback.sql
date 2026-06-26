-- Structured mock feedback: per-area tech scores (frontend, backend, DB, deployment, custom) + overall.

alter table public.mock_registrations
  add column if not exists tech_feedback jsonb;

comment on column public.mock_registrations.tech_feedback is
  'Structured feedback: { "areas": [{ "key", "label", "score", "notes" }] }; notes required per rated area.';

-- Replace legacy 4-score signature with structured feedback
drop function if exists public.submit_mock_feedback(uuid, integer, integer, integer, integer, text);

create or replace function public.submit_mock_feedback(
  p_registration_id uuid,
  p_overall_score int,
  p_communication_score int,
  p_feedback_notes text default null,
  p_tech_feedback jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aspirant_id uuid;
  v_area jsonb;
  v_areas jsonb;
  v_count int := 0;
  v_score int;
  v_sum int := 0;
  v_avg int;
begin
  if not public.is_admin() and not exists (
    select 1 from public.mock_registrations where id = p_registration_id and interviewer_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if p_overall_score is null or p_overall_score < 0 or p_overall_score > 10
     or p_communication_score is null or p_communication_score < 0 or p_communication_score > 10 then
    return jsonb_build_object('ok', false, 'error', 'Overall and communication scores must be 0–10');
  end if;

  if length(trim(coalesce(p_feedback_notes, ''))) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Overall feedback is required (at least 10 characters)');
  end if;

  if p_tech_feedback is null or jsonb_typeof(p_tech_feedback -> 'areas') <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'Rate at least one technical area');
  end if;

  v_areas := p_tech_feedback -> 'areas';
  for v_area in select value from jsonb_array_elements(v_areas)
  loop
    v_score := (v_area ->> 'score')::int;
    if v_score is null or v_score < 0 or v_score > 10 then
      return jsonb_build_object('ok', false, 'error', 'Each area score must be 0–10');
    end if;
    if coalesce(trim(v_area ->> 'label'), '') = '' then
      return jsonb_build_object('ok', false, 'error', 'Each rated area needs a label');
    end if;
    if length(trim(coalesce(v_area ->> 'notes', ''))) < 10 then
      return jsonb_build_object(
        'ok', false,
        'error', 'Written feedback is required for each technical area you rate (at least 10 characters per area)'
      );
    end if;
    v_count := v_count + 1;
    v_sum := v_sum + v_score;
  end loop;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'Rate at least one technical area');
  end if;

  v_avg := round(v_sum::numeric / v_count)::int;

  select aspirant_id into v_aspirant_id
  from public.mock_registrations
  where id = p_registration_id and status = 'scheduled';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or already completed');
  end if;

  update public.mock_registrations
  set
    overall_score = p_overall_score,
    communication_score = p_communication_score,
    feedback_notes = nullif(trim(coalesce(p_feedback_notes, '')), ''),
    tech_feedback = p_tech_feedback,
    technical_score = v_avg,
    problem_solving_score = null,
    feedback_submitted_at = now(),
    status = 'completed',
    completed_at = now()
  where id = p_registration_id;

  insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
  values (
    null,
    v_aspirant_id,
    'Your mock interview feedback is ready. Check the Mocks page for scores and notes.',
    p_registration_id
  );

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.submit_mock_feedback(uuid, int, int, text, jsonb) is
  'Interviewer/admin: structured tech-area feedback + required written notes; marks mock completed.';

-- Include tech_feedback in interviewer list
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
      'tech_feedback', r.tech_feedback,
      'feedback_submitted_at', r.feedback_submitted_at,
      'completed_at', r.completed_at,
      'created_at', r.created_at
    ) order by
      case when nullif(trim(coalesce(p_status, '')), '') = 'scheduled' then r.scheduled_at end asc nulls last,
      coalesce(r.completed_at, r.scheduled_at, r.created_at) desc nulls last
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  where r.interviewer_id = v_uid
    and (p_status is null or trim(p_status) = '' or r.status = p_status);
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- Admin registrations list
create or replace function public.get_admin_mock_registrations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_summary jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('registrations', '[]'::jsonb, 'by_aspirant', '{}'::jsonb);
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'created_at', r.created_at,
      'availability_notes', r.availability_notes,
      'scheduled_at', r.scheduled_at,
      'meet_link', r.meet_link,
      'admin_notes', r.admin_notes,
      'completed_at', r.completed_at,
      'status', r.status,
      'slot_id', r.slot_id,
      'interviewer_id', r.interviewer_id,
      'interviewer_name', adm.name,
      'technical_score', r.technical_score,
      'communication_score', r.communication_score,
      'problem_solving_score', r.problem_solving_score,
      'overall_score', r.overall_score,
      'feedback_notes', r.feedback_notes,
      'tech_feedback', r.tech_feedback,
      'feedback_submitted_at', r.feedback_submitted_at
    ) order by r.created_at desc
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  left join public.admins adm on adm.id = r.interviewer_id;

  select jsonb_object_agg(aspirant_id, conducted_count)
  into v_summary
  from (
    select aspirant_id, count(*)::int as conducted_count
    from public.mock_registrations
    where status = 'completed'
    group by aspirant_id
  ) s;

  return jsonb_build_object(
    'registrations', coalesce(v_rows, '[]'::jsonb),
    'by_aspirant', coalesce(v_summary, '{}'::jsonb)
  );
end;
$$;

-- Completed report
create or replace function public.get_admin_mocks_completed_report(p_from_date date default null, p_to_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_from date := coalesce(p_from_date, current_date - 30);
  v_to date := coalesce(p_to_date, current_date);
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'created_at', r.created_at,
      'scheduled_at', r.scheduled_at,
      'completed_at', r.completed_at,
      'meet_link', r.meet_link,
      'status', r.status,
      'interviewer_id', r.interviewer_id,
      'interviewer_name', adm.name,
      'technical_score', r.technical_score,
      'communication_score', r.communication_score,
      'problem_solving_score', r.problem_solving_score,
      'overall_score', r.overall_score,
      'feedback_notes', r.feedback_notes,
      'tech_feedback', r.tech_feedback
    ) order by coalesce(r.completed_at, r.scheduled_at, r.created_at) desc
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  left join public.admins adm on adm.id = r.interviewer_id
  where r.status = 'completed'
    and (r.completed_at::date between v_from and v_to
         or (r.completed_at is null and r.scheduled_at is not null and r.scheduled_at::date between v_from and v_to)
         or (r.completed_at is null and r.scheduled_at is null and r.created_at::date between v_from and v_to));
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
