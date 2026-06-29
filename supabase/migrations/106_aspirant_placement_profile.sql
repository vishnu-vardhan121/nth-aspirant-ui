-- Aspirant placement / pipeline status (separate from subscription active/expired).

alter table public.aspirants
  add column if not exists profile_status text not null default 'active',
  add column if not exists placed_in text,
  add column if not exists placed_at date;

alter table public.aspirants
  drop constraint if exists aspirants_profile_status_check;

alter table public.aspirants
  add constraint aspirants_profile_status_check
  check (profile_status in ('active', 'inactive'));

comment on column public.aspirants.profile_status is
  'Hiring pipeline: active = in pool; inactive = placed or done with NTH.';
comment on column public.aspirants.placed_in is
  'Company / role when profile_status is inactive.';
comment on column public.aspirants.placed_at is
  'Placement date when profile_status is inactive.';

create index if not exists aspirants_profile_status_idx
  on public.aspirants (profile_status);

-- Admin: mark aspirant active or placed (inactive).
create or replace function public.update_aspirant_placement_for_admin(
  p_aspirant_id uuid,
  p_profile_status text,
  p_placed_in text default null,
  p_placed_at date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_profile_status, '')));
  v_placed_in text := nullif(trim(coalesce(p_placed_in, '')), '');
  v_placed_at date := p_placed_at;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if p_aspirant_id is null or not exists (select 1 from public.aspirants where id = p_aspirant_id) then
    return jsonb_build_object('ok', false, 'error', 'Aspirant not found');
  end if;

  if v_status not in ('active', 'inactive') then
    return jsonb_build_object('ok', false, 'error', 'Profile status must be active or inactive');
  end if;

  if v_status = 'inactive' then
    if v_placed_in is null or length(v_placed_in) < 2 then
      return jsonb_build_object('ok', false, 'error', 'Placed in (company / role) is required when marking inactive');
    end if;
    if v_placed_at is null then
      v_placed_at := current_date;
    end if;
  else
    v_placed_in := null;
    v_placed_at := null;
  end if;

  update public.aspirants
  set
    profile_status = v_status,
    placed_in = v_placed_in,
    placed_at = v_placed_at
  where id = p_aspirant_id;

  return jsonb_build_object(
    'ok', true,
    'profile_status', v_status,
    'placed_in', v_placed_in,
    'placed_at', v_placed_at
  );
end;
$$;

comment on function public.update_aspirant_placement_for_admin(uuid, text, text, date) is
  'Admin: set aspirant pipeline status (active / placed-inactive).';

grant execute on function public.update_aspirant_placement_for_admin(uuid, text, text, date) to authenticated;

-- Extend admin users list with profile_status filter + fields.
drop function if exists public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text, numeric, numeric, numeric, text, numeric, numeric, text, text, int, int
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
  p_mock_status text default null,
  p_mock_overall_min numeric default null,
  p_mock_communication_min numeric default null,
  p_mock_technical_min numeric default null,
  p_mock_topic_key text default null,
  p_mock_topic_score_min numeric default null,
  p_mock_topic_score_max numeric default null,
  p_mock_topic_mode text default 'any',
  p_role_fit_key text default null,
  p_profile_status text default null,
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
  v_topic_key text := nullif(trim(lower(coalesce(p_mock_topic_key, ''))), '');
  v_topic_mode text := lower(coalesce(nullif(trim(p_mock_topic_mode), ''), 'any'));
  v_role_fit_key text := nullif(trim(lower(coalesce(p_role_fit_key, ''))), '');
  v_profile_status text := nullif(trim(lower(coalesce(p_profile_status, ''))), '');
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;

  if v_profile_status is not null and v_profile_status not in ('active', 'inactive') then
    v_profile_status := null;
  end if;

  if p_skills is not null and trim(p_skills) <> '' then
    select coalesce(array_agg(lower(trim(x))), '{}')
    into v_skills
    from unnest(string_to_array(p_skills, ',')) as t(x)
    where trim(x) <> '';
  end if;

  if v_topic_mode not in ('any', 'latest', 'best') then
    v_topic_mode := 'any';
  end if;

  select jsonb_agg(row order by row->>'full_name')
  into v_rows
  from (
    select jsonb_build_object(
      'id', a.id,
      'full_name', a.full_name,
      'email', a.email,
      'phone', a.phone,
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
      'profile_status', coalesce(a.profile_status, 'active'),
      'placed_in', a.placed_in,
      'placed_at', a.placed_at,
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
      'mock_month_end', mb.period_end,
      'latest_mock_overall', latest_mock.overall_score,
      'latest_mock_communication', latest_mock.communication_score,
      'latest_mock_technical', latest_mock.technical_score,
      'latest_mock_completed_at', latest_mock.completed_at,
      'latest_mock_role_fit_keys', latest_mock.role_fit_keys,
      'best_mock_topic_score', case when v_topic_key is not null then (
        select max(t.score)::int from public.mock_feedback_topics t
        inner join public.mock_registrations r on r.id = t.mock_registration_id and r.status = 'completed'
        where t.aspirant_id = a.id and t.topic_key = v_topic_key
      ) else null end
    ) as row
    from public.aspirants a
    left join lateral public.get_mock_month_bounds(
      a.plan_started_at,
      case when a.plan is not null and a.plan_started_at is not null
        then public.subscription_ends_at(a.plan, a.plan_started_at) else null end
    ) mb on a.plan_started_at is not null
    left join lateral (
      select r.overall_score, r.communication_score, r.technical_score, r.completed_at, r.role_fit_keys
      from public.mock_registrations r
      where r.aspirant_id = a.id and r.status = 'completed'
      order by r.completed_at desc nulls last
      limit 1
    ) latest_mock on true
    where (p_plan is null or a.plan = p_plan)
      and (p_track is null or (p_track = 'fresher' and coalesce(a.track, 'fresher') = 'fresher') or (p_track = 'experienced' and a.track = 'experienced'))
      and (v_search is null or (
        a.full_name ilike '%' || v_search || '%'
        or a.email ilike '%' || v_search || '%'
        or coalesce(a.role_title, a.primary_role, '') ilike '%' || v_search || '%'
        or coalesce(a.college_name, '') ilike '%' || v_search || '%'
        or coalesce(a.placed_in, '') ilike '%' || v_search || '%'
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
      and (v_profile_status is null or coalesce(a.profile_status, 'active') = v_profile_status)
      and (p_mock_overall_min is null or (latest_mock.overall_score is not null and latest_mock.overall_score >= p_mock_overall_min))
      and (p_mock_communication_min is null or (latest_mock.communication_score is not null and latest_mock.communication_score >= p_mock_communication_min))
      and (p_mock_technical_min is null or (latest_mock.technical_score is not null and latest_mock.technical_score >= p_mock_technical_min))
      and (v_topic_key is null or (
        (v_topic_mode = 'any' and exists (
          select 1 from public.mock_feedback_topics t
          inner join public.mock_registrations r on r.id = t.mock_registration_id and r.status = 'completed'
          where t.aspirant_id = a.id and t.topic_key = v_topic_key
            and (p_mock_topic_score_min is null or t.score >= p_mock_topic_score_min)
            and (p_mock_topic_score_max is null or t.score <= p_mock_topic_score_max)
        ))
        or (v_topic_mode = 'latest' and exists (
          select 1 from public.mock_feedback_topics t
          inner join public.mock_registrations r on r.id = t.mock_registration_id
          where t.aspirant_id = a.id and t.topic_key = v_topic_key and r.status = 'completed'
            and r.id = (
              select r2.id from public.mock_registrations r2
              where r2.aspirant_id = a.id and r2.status = 'completed'
              order by r2.completed_at desc nulls last
              limit 1
            )
            and (p_mock_topic_score_min is null or t.score >= p_mock_topic_score_min)
            and (p_mock_topic_score_max is null or t.score <= p_mock_topic_score_max)
        ))
        or (v_topic_mode = 'best' and coalesce((
          select max(t.score)::numeric from public.mock_feedback_topics t
          inner join public.mock_registrations r on r.id = t.mock_registration_id and r.status = 'completed'
          where t.aspirant_id = a.id and t.topic_key = v_topic_key
        ), -1) >= coalesce(p_mock_topic_score_min, 0)
        and coalesce((
          select max(t.score)::numeric from public.mock_feedback_topics t
          inner join public.mock_registrations r on r.id = t.mock_registration_id and r.status = 'completed'
          where t.aspirant_id = a.id and t.topic_key = v_topic_key
        ), -1) <= coalesce(p_mock_topic_score_max, 10))
      ))
      and (v_role_fit_key is null or exists (
        select 1 from public.mock_registrations r
        where r.aspirant_id = a.id
          and r.status = 'completed'
          and v_role_fit_key = any (coalesce(r.role_fit_keys, '{}'))
      ))
      and (p_mock_status is null or (
        (p_mock_status = 'never_mocked' and not exists (
          select 1 from public.mock_registrations r
          where r.aspirant_id = a.id and r.status = 'completed'
        ))
        or (p_mock_status = 'requested' and exists (
          select 1 from public.mock_registrations r
          where r.aspirant_id = a.id and r.status = 'requested'
        ))
        or (p_mock_status = 'scheduled' and exists (
          select 1 from public.mock_registrations r
          where r.aspirant_id = a.id and r.status = 'scheduled'
        ))
        or (p_mock_status = 'completed_any' and exists (
          select 1 from public.mock_registrations r
          where r.aspirant_id = a.id and r.status = 'completed'
        ))
        or (p_mock_status = 'has_quota_left' and a.plan is not null and a.plan_started_at is not null
          and (
            select count(*)::int from public.mock_registrations r
            where r.aspirant_id = a.id and r.status = 'completed'
              and r.completed_at >= mb.period_start and r.completed_at < mb.period_end
          ) < (public.get_mock_limit(a.plan) + coalesce(a.extra_mock_limit, 0))
        )
        or (p_mock_status = 'quota_used_up' and a.plan is not null and a.plan_started_at is not null
          and (
            select count(*)::int from public.mock_registrations r
            where r.aspirant_id = a.id and r.status = 'completed'
              and r.completed_at >= mb.period_start and r.completed_at < mb.period_end
          ) >= (public.get_mock_limit(a.plan) + coalesce(a.extra_mock_limit, 0))
        )
      ))
    order by a.full_name
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0))
  ) sub;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

comment on function public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text, numeric, numeric, numeric, text, numeric, numeric, text, text, text, int, int
) is 'Admin: aspirant list with profile, mock, role-fit, and placement filters.';

grant execute on function public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text, numeric, numeric, numeric, text, numeric, numeric, text, text, text, int, int
) to authenticated;

-- Admin profile: placement fields (full body from 105 + placement).
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
      'resume_url', a.resume_url,
      'profile_status', coalesce(a.profile_status, 'active'),
      'placed_in', a.placed_in,
      'placed_at', a.placed_at
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
          'latest_completed_at', lm.completed_at,
          'latest_role_fit_keys', lm.role_fit_keys
        )
        from lateral (
          select r.overall_score, r.communication_score, r.technical_score, r.completed_at, r.role_fit_keys
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
            'role_fit_keys', r.role_fit_keys,
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
  'Admin: full aspirant profile with placement, mock history, and role-fit tags.';
