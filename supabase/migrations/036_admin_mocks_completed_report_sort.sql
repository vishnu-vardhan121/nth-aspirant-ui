-- Add optional sort/filter by score columns to completed mocks report.

create or replace function public.get_admin_mocks_completed_report(
  p_from_date date default null,
  p_to_date date default null,
  p_sort_by text default null,
  p_order text default 'desc'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_from date := coalesce(p_from_date, current_date - 30);
  v_to date := coalesce(p_to_date, current_date);
  v_order text := case when lower(nullif(trim(p_order), '')) = 'asc' then 'asc' else 'desc' end;
  v_sort text := nullif(trim(lower(coalesce(p_sort_by, ''))), '');
  v_order_col text;
  v_sql text;
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;

  v_order_col := case v_sort
    when 'technical_score' then 'r.technical_score'
    when 'communication_score' then 'r.communication_score'
    when 'problem_solving_score' then 'r.problem_solving_score'
    when 'overall_score' then 'r.overall_score'
    when 'completed_at' then 'r.completed_at'
    when 'scheduled_at' then 'r.scheduled_at'
    when 'aspirant_name' then 'a.full_name'
    else 'coalesce(r.completed_at, r.scheduled_at, r.created_at)'
  end;

  v_sql := format(
    $q$
    select coalesce(jsonb_agg(sub.row order by sub.sort_key %s nulls last), '[]'::jsonb)
    from (
      select jsonb_build_object(
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
        'feedback_notes', r.feedback_notes
      ) as row,
      %s as sort_key
      from public.mock_registrations r
      join public.aspirants a on a.id = r.aspirant_id
      left join public.admins adm on adm.id = r.interviewer_id
      where r.status = 'completed'
        and (r.completed_at::date between $1 and $2
             or (r.completed_at is null and r.scheduled_at is not null and r.scheduled_at::date between $1 and $2)
             or (r.completed_at is null and r.scheduled_at is null and r.created_at::date between $1 and $2))
    ) sub
    $q$,
    v_order,
    v_order_col
  );

  execute v_sql into v_rows using v_from, v_to;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
