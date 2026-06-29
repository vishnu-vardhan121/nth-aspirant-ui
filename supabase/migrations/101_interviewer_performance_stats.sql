-- Interviewer self-service performance stats + super-admin interviewer leaderboard.

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where id = auth.uid() and role = 'super admin'
  );
$$;

comment on function public.is_super_admin() is
  'True when the current user is a super admin.';

-- Interviewer: own performance summary for a date range (default last 30 days).
create or replace function public.get_interviewer_performance(
  p_from_date date default null,
  p_to_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from date := coalesce(p_from_date, current_date - 30);
  v_to date := coalesce(p_to_date, current_date);
  v_stats jsonb;
  v_recent jsonb;
begin
  if not public.is_interviewer() then
    return '{}'::jsonb;
  end if;

  select jsonb_build_object(
    'completed_count', count(*) filter (
      where r.status = 'completed'
        and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
    ),
    'scheduled_count', count(*) filter (
      where r.status = 'scheduled'
        and coalesce(r.scheduled_at, r.created_at)::date between v_from and v_to
    ),
    'no_show_count', count(*) filter (
      where r.status = 'no_show'
        and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
    ),
    'cancelled_count', count(*) filter (
      where r.status = 'cancelled'
        and coalesce(r.scheduled_at, r.created_at)::date between v_from and v_to
    ),
    'avg_overall_score', round(avg(r.overall_score) filter (
      where r.status = 'completed'
        and r.overall_score is not null
        and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
    )::numeric, 1),
    'avg_communication_score', round(avg(r.communication_score) filter (
      where r.status = 'completed'
        and r.communication_score is not null
        and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
    )::numeric, 1),
    'avg_technical_score', round(avg(r.technical_score) filter (
      where r.status = 'completed'
        and r.technical_score is not null
        and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
    )::numeric, 1)
  ) into v_stats
  from public.mock_registrations r
  where r.interviewer_id = v_uid;

  select coalesce(jsonb_agg(sub.row), '[]'::jsonb) into v_recent
  from (
    select jsonb_build_object(
      'id', r.id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'completed_at', r.completed_at,
      'scheduled_at', r.scheduled_at,
      'overall_score', r.overall_score,
      'communication_score', r.communication_score,
      'technical_score', r.technical_score
    ) as row
    from public.mock_registrations r
    join public.aspirants a on a.id = r.aspirant_id
    where r.interviewer_id = v_uid
      and r.status = 'completed'
      and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
    order by coalesce(r.completed_at, r.scheduled_at, r.created_at) desc
    limit 25
  ) sub;

  return coalesce(v_stats, '{}'::jsonb)
    || jsonb_build_object(
      'from_date', v_from,
      'to_date', v_to,
      'recent_completed', coalesce(v_recent, '[]'::jsonb)
    );
end;
$$;

comment on function public.get_interviewer_performance(date, date) is
  'Interviewer: completed/scheduled/no-show counts, average scores, and recent completed mocks for a date range.';

-- Super admin: per-interviewer aggregates for a date range.
create or replace function public.get_admin_interviewer_stats(
  p_from_date date default null,
  p_to_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := coalesce(p_from_date, current_date - 30);
  v_to date := coalesce(p_to_date, current_date);
  v_rows jsonb;
begin
  if not public.is_super_admin() then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'interviewer_id', adm.id,
      'interviewer_name', adm.name,
      'interviewer_email', adm.email,
      'completed_count', count(r.id) filter (
        where r.status = 'completed'
          and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
      ),
      'scheduled_count', count(r.id) filter (
        where r.status = 'scheduled'
          and coalesce(r.scheduled_at, r.created_at)::date between v_from and v_to
      ),
      'no_show_count', count(r.id) filter (
        where r.status = 'no_show'
          and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
      ),
      'cancelled_count', count(r.id) filter (
        where r.status = 'cancelled'
          and coalesce(r.scheduled_at, r.created_at)::date between v_from and v_to
      ),
      'avg_overall_score', round(avg(r.overall_score) filter (
        where r.status = 'completed'
          and r.overall_score is not null
          and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
      )::numeric, 1),
      'avg_communication_score', round(avg(r.communication_score) filter (
        where r.status = 'completed'
          and r.communication_score is not null
          and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
      )::numeric, 1),
      'avg_technical_score', round(avg(r.technical_score) filter (
        where r.status = 'completed'
          and r.technical_score is not null
          and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
      )::numeric, 1),
      'last_completed_at', max(r.completed_at) filter (
        where r.status = 'completed'
          and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
      )
    ) order by
      count(r.id) filter (
        where r.status = 'completed'
          and coalesce(r.completed_at, r.scheduled_at, r.created_at)::date between v_from and v_to
      ) desc,
      adm.name asc
  ), '[]'::jsonb) into v_rows
  from public.admins adm
  left join public.mock_registrations r on r.interviewer_id = adm.id
  where adm.role = 'interviewer'
  group by adm.id, adm.name, adm.email;

  return jsonb_build_object(
    'from_date', v_from,
    'to_date', v_to,
    'interviewers', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

comment on function public.get_admin_interviewer_stats(date, date) is
  'Super admin: per-interviewer mock counts and average scores for a date range.';
