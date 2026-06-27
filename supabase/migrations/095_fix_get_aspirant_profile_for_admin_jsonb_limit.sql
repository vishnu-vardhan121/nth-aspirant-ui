-- Fix: jsonb_build_object accepts at most 100 arguments (50 key/value pairs).
-- get_aspirant_profile_for_admin had 54 pairs after 093 → error 54023.

create or replace function public.get_aspirant_profile_for_admin(p_aspirant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_conducted_period int := 0;
begin
  if not public.is_admin() or p_aspirant_id is null then
    return 'null'::jsonb;
  end if;

  select mb.period_start, mb.period_end
  into v_period_start, v_period_end
  from public.aspirants a
  left join lateral public.get_mock_month_bounds(
    a.plan_started_at,
    case when a.plan is not null and a.plan_started_at is not null
      then public.subscription_ends_at(a.plan, a.plan_started_at) else null end
  ) mb on a.plan_started_at is not null
  where a.id = p_aspirant_id;

  if v_period_start is not null then
    select count(*)::int into v_conducted_period
    from public.mock_registrations r
    where r.aspirant_id = p_aspirant_id and r.status = 'completed'
      and r.completed_at >= v_period_start and r.completed_at < v_period_end;
  end if;

  select
    jsonb_build_object(
      'id', a.id,
      'full_name', a.full_name,
      'email', a.email,
      'phone', a.phone,
      'city', a.city,
      'country', a.country,
      'track', a.track,
      'experience_years', a.experience_years,
      'primary_role', a.primary_role,
      'job_domain', a.job_domain,
      'job_domain_other', a.job_domain_other,
      'job_domains', a.job_domains,
      'role_title', a.role_title,
      'role_specializations', a.role_specializations,
      'current_company', a.current_company,
      'previous_company', a.previous_company,
      'employment_status', a.employment_status,
      'work_mode', a.work_mode,
      'current_ctc', a.current_ctc,
      'expected_salary_min', a.expected_salary_min,
      'expected_salary_max', a.expected_salary_max,
      'linkedin_url', a.linkedin_url,
      'portfolio_url', a.portfolio_url,
      'willing_relocate', a.willing_relocate,
      'available_from', a.available_from,
      'bio', a.bio,
      'education', a.education,
      'education_path', a.education_path,
      'intermediate_type', a.intermediate_type,
      'highest_qualification', a.highest_qualification,
      'degree_branch', a.degree_branch,
      'degree_branch_other', a.degree_branch_other,
      'graduation_year', a.graduation_year,
      'is_currently_studying', a.is_currently_studying,
      'expected_graduation_year', a.expected_graduation_year,
      'graduation_score_type', a.graduation_score_type,
      'graduation_score', a.graduation_score,
      'college_name', a.college_name,
      'premier_institute_type', a.premier_institute_type,
      'institute_tier', a.institute_tier,
      'communication_level', a.communication_level,
      'notice_period', a.notice_period,
      'skills', a.skills,
      'secondary_skills', a.secondary_skills,
      'resume_url', a.resume_url
    )
    || jsonb_build_object(
      'plan', a.plan,
      'plan_started_at', a.plan_started_at,
      'extra_mock_limit', coalesce(a.extra_mock_limit, 0),
      'extra_interview_limit', coalesce(a.extra_interview_limit, 0),
      'mock_limit', public.get_mock_limit(a.plan) + coalesce(a.extra_mock_limit, 0),
      'is_active', public.is_subscription_active(a.plan, a.plan_started_at),
      'subscription_ends_at', case when a.plan is not null and a.plan_started_at is not null
        then public.subscription_ends_at(a.plan, a.plan_started_at) else null end,
      'mock_summary', (
        select jsonb_build_object(
          'completed_total', (select count(*)::int from public.mock_registrations r where r.aspirant_id = a.id and r.status = 'completed'),
          'scheduled_count', (select count(*)::int from public.mock_registrations r where r.aspirant_id = a.id and r.status = 'scheduled'),
          'requested_count', (select count(*)::int from public.mock_registrations r where r.aspirant_id = a.id and r.status = 'requested'),
          'cancelled_count', (select count(*)::int from public.mock_registrations r where r.aspirant_id = a.id and r.status in ('cancelled', 'no_show')),
          'mocks_conducted_in_period', v_conducted_period,
          'mocks_pending_in_period', (
            select count(*)::int from public.mock_registrations r
            left join public.mock_slots s on s.id = r.slot_id
            where r.aspirant_id = a.id and r.status = 'scheduled'
              and v_period_start is not null
              and coalesce(r.scheduled_at, s.start_at, r.created_at) >= v_period_start
              and coalesce(r.scheduled_at, s.start_at, r.created_at) < v_period_end
          ),
          'mock_limit', public.get_mock_limit(a.plan) + coalesce(a.extra_mock_limit, 0),
          'mock_period_start', v_period_start,
          'mock_period_end', v_period_end,
          'latest_overall', lm.overall_score,
          'latest_communication', lm.communication_score,
          'latest_technical', lm.technical_score,
          'latest_completed_at', lm.completed_at
        )
        from lateral (
          select r.overall_score, r.communication_score, r.technical_score, r.completed_at
          from public.mock_registrations r
          where r.aspirant_id = a.id and r.status = 'completed'
          order by r.completed_at desc nulls last
          limit 1
        ) lm
      ),
      'mocks', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'status', r.status,
            'created_at', r.created_at,
            'scheduled_at', r.scheduled_at,
            'completed_at', r.completed_at,
            'interviewer_name', adm.name,
            'overall_score', r.overall_score,
            'communication_score', r.communication_score,
            'technical_score', r.technical_score,
            'feedback_notes', r.feedback_notes,
            'tech_feedback', r.tech_feedback,
            'availability_notes', r.availability_notes,
            'meet_link', r.meet_link
          )
          order by coalesce(r.completed_at, r.scheduled_at, r.created_at) desc
        )
        from public.mock_registrations r
        left join public.admins adm on adm.id = r.interviewer_id
        where r.aspirant_id = a.id
      ), '[]'::jsonb)
    )
  into v_row
  from public.aspirants a
  where a.id = p_aspirant_id;

  return coalesce(v_row, 'null'::jsonb);
end;
$$;

comment on function public.get_aspirant_profile_for_admin is
  'Admin: full aspirant profile with mock history and summary.';
