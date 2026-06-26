-- Interviewer mocks list: latest first (completed and recent at top).

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

comment on function public.get_interviewer_mocks(text) is
  'Interviewer: own mock registrations; latest first (scheduled filter = soonest upcoming first).';
