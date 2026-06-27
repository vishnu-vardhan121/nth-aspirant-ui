-- Admin user list: server-side filters on new aspirant profile columns.

drop function if exists public.get_admin_users_list(text, text, int, int);
drop function if exists public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, int, int
);

create or replace function public.get_admin_users_list(
  p_plan text default null,
  p_track text default null,
  p_search text default null,
  p_job_domain text default null,
  p_highest_qualification text default null,
  p_degree_branch text default null,
  p_graduation_year int default null,
  p_graduation_score_min numeric default null,
  p_premier_institute_type text default null,
  p_institute_tier text default null,
  p_communication_level text default null,
  p_notice_period text default null,
  p_skills text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_skills text[];
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;

  if p_skills is not null and trim(p_skills) <> '' then
    select coalesce(array_agg(lower(trim(x))), '{}')
    into v_skills
    from unnest(string_to_array(p_skills, ',')) as t(x)
    where trim(x) <> '';
  end if;

  select jsonb_agg(row order by row->>'full_name')
  into v_rows
  from (
    select jsonb_build_object(
      'id', a.id,
      'full_name', a.full_name,
      'email', a.email,
      'plan', a.plan,
      'track', coalesce(a.track, 'fresher'),
      'job_domain', a.job_domain,
      'job_domains', a.job_domains,
      'role_title', coalesce(a.role_title, a.primary_role),
      'highest_qualification', a.highest_qualification,
      'degree_branch', a.degree_branch,
      'degree_branch_other', a.degree_branch_other,
      'graduation_year', coalesce(a.graduation_year, a.expected_graduation_year),
      'graduation_score', a.graduation_score,
      'graduation_score_type', a.graduation_score_type,
      'college_name', a.college_name,
      'premier_institute_type', a.premier_institute_type,
      'institute_tier', a.institute_tier,
      'communication_level', a.communication_level,
      'notice_period', a.notice_period,
      'available_from', a.available_from,
      'skills', a.skills,
      'plan_started_at', a.plan_started_at,
      'created_at', a.created_at,
      'subscription_ends_at', case when a.plan is not null and a.plan_started_at is not null then public.subscription_ends_at(a.plan, a.plan_started_at) else null end,
      'days_until_expiry', case
        when public.is_subscription_active(a.plan, a.plan_started_at) then
          (public.subscription_ends_at(a.plan, a.plan_started_at)::date - current_date)
        else null
      end,
      'is_active', public.is_subscription_active(a.plan, a.plan_started_at),
      'applications_this_month', (
        select count(*)::int from public.applications app
        where app.aspirant_id = a.id and app.created_at >= date_trunc('month', now()) and coalesce(app.status, 'applied') != 'rejected'
      ),
      'application_limit', public.get_job_applications_limit(a.plan) + coalesce(a.extra_interview_limit, 0),
      'extra_interview_limit', coalesce(a.extra_interview_limit, 0),
      'mocks_conducted_in_period', (
        select count(*)::int from public.mock_registrations r
        where r.aspirant_id = a.id and r.status = 'completed'
          and a.plan_started_at is not null and a.plan is not null
          and r.completed_at >= mb.period_start and r.completed_at < mb.period_end
      ),
      'mocks_pending_in_period', (
        select count(*)::int from public.mock_registrations r
        left join public.mock_slots s on s.id = r.slot_id
        where r.aspirant_id = a.id and r.status = 'scheduled'
          and a.plan_started_at is not null and a.plan is not null
          and coalesce(r.scheduled_at, s.start_at, r.created_at) >= mb.period_start
          and coalesce(r.scheduled_at, s.start_at, r.created_at) < mb.period_end
      ),
      'mock_limit', public.get_mock_limit(a.plan) + coalesce(a.extra_mock_limit, 0),
      'extra_mock_limit', coalesce(a.extra_mock_limit, 0),
      'mock_month_start', mb.period_start,
      'mock_month_end', mb.period_end
    ) as row
    from public.aspirants a
    left join lateral public.get_mock_month_bounds(
      a.plan_started_at,
      case when a.plan is not null and a.plan_started_at is not null
        then public.subscription_ends_at(a.plan, a.plan_started_at) else null end
    ) mb on a.plan_started_at is not null
    where (p_plan is null or a.plan = p_plan)
      and (p_track is null or (p_track = 'fresher' and coalesce(a.track, 'fresher') = 'fresher') or (p_track = 'experienced' and a.track = 'experienced'))
      and (v_search is null or (
        a.full_name ilike '%' || v_search || '%'
        or a.email ilike '%' || v_search || '%'
        or coalesce(a.role_title, a.primary_role, '') ilike '%' || v_search || '%'
        or coalesce(a.college_name, '') ilike '%' || v_search || '%'
      ))
      and (p_job_domain is null
        or p_job_domain = any (coalesce(a.job_domains, '{}'))
        or a.job_domain = p_job_domain)
      and (p_highest_qualification is null or a.highest_qualification = p_highest_qualification)
      and (p_degree_branch is null or a.degree_branch = p_degree_branch)
      and (p_graduation_year is null or coalesce(a.graduation_year, a.expected_graduation_year) = p_graduation_year)
      and (p_graduation_score_min is null or (a.graduation_score is not null and a.graduation_score >= p_graduation_score_min))
      and (p_premier_institute_type is null or a.premier_institute_type = p_premier_institute_type)
      and (p_institute_tier is null or a.institute_tier = p_institute_tier)
      and (p_communication_level is null or a.communication_level = p_communication_level)
      and (p_notice_period is null or a.notice_period = p_notice_period)
      and (
        v_skills is null
        or cardinality(v_skills) = 0
        or exists (
          select 1 from unnest(v_skills) s(skill)
          where lower(skill) = any (select lower(x) from unnest(coalesce(a.skills, '{}')) x)
            or lower(skill) = any (select lower(x) from unnest(coalesce(a.role_specializations, '{}')) x)
        )
      )
    order by a.full_name
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0))
  ) sub;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

comment on function public.get_admin_users_list is
  'Admin: paginated aspirant list with plan/track/profile filters.';
