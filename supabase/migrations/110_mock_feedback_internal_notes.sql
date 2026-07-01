-- Mock feedback internal notes + aspirant placement-ready pipeline (interviewer "yes" → aspirant notified).

alter table public.aspirants
  add column if not exists placement_pipeline_status text not null default 'none',
  add column if not exists placement_ready_at timestamptz,
  add column if not exists placement_ready_mock_id uuid references public.mock_registrations(id) on delete set null;

alter table public.aspirants
  drop constraint if exists aspirants_placement_pipeline_status_check;

alter table public.aspirants
  add constraint aspirants_placement_pipeline_status_check
  check (placement_pipeline_status in ('none', 'ready'));

comment on column public.aspirants.placement_pipeline_status is
  'none = in pool; ready = interviewer marked placement-ready after mock (aspirant-visible).';
comment on column public.aspirants.placement_ready_at is
  'When the aspirant was marked placement-ready.';
comment on column public.aspirants.placement_ready_mock_id is
  'Mock registration that triggered placement-ready status.';

create index if not exists aspirants_placement_pipeline_status_idx
  on public.aspirants (placement_pipeline_status);

alter table public.mock_registrations
  add column if not exists placement_recommendation text,
  add column if not exists placement_recommendation_note text,
  add column if not exists communication_admin_note text;

alter table public.mock_registrations
  drop constraint if exists mock_registrations_placement_recommendation_check;

alter table public.mock_registrations
  add constraint mock_registrations_placement_recommendation_check
  check (placement_recommendation is null or placement_recommendation in ('yes', 'no', 'not_yet'));

comment on column public.mock_registrations.placement_recommendation is
  'Interviewer-only: yes/no/not_yet for placement pipeline. Admin view only.';
comment on column public.mock_registrations.placement_recommendation_note is
  'Interviewer-only note on placement readiness. Admin view only.';
comment on column public.mock_registrations.communication_admin_note is
  'Interviewer-only communication notes for admin review. Not shown to aspirants.';

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
  v_feedback text;
  v_suggestions text;
  v_rating text;
  v_topic_key text;
  v_topic_label text;
  v_category text;
  v_role_fit text[];
  v_placement text;
  v_placement_note text;
  v_comm_admin_note text;
  v_tech_feedback jsonb;
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

  if length(trim(coalesce(p_feedback_notes, ''))) < 30 then
    return jsonb_build_object('ok', false, 'error', 'Overall summary is required (at least 30 characters)');
  end if;

  if p_tech_feedback is null or jsonb_typeof(p_tech_feedback -> 'areas') <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'Rate at least one interview topic');
  end if;

  v_placement := lower(nullif(trim(p_tech_feedback ->> 'placement_recommendation'), ''));
  if v_placement is null or v_placement not in ('yes', 'no', 'not_yet') then
    return jsonb_build_object('ok', false, 'error', 'Select whether this candidate is ready for the placement pipeline');
  end if;

  v_placement_note := nullif(trim(p_tech_feedback ->> 'placement_recommendation_note'), '');
  if v_placement_note is not null and length(v_placement_note) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'Placement note is too long (max 2000 characters)');
  end if;

  v_comm_admin_note := nullif(trim(p_tech_feedback ->> 'communication_admin_note'), '');
  if v_comm_admin_note is not null and length(v_comm_admin_note) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'Communication admin note is too long (max 2000 characters)');
  end if;

  v_role_fit := public.normalize_mock_role_fit_keys(p_tech_feedback -> 'role_fit');

  v_tech_feedback := p_tech_feedback
    - 'role_fit'
    - 'placement_recommendation'
    - 'placement_recommendation_note'
    - 'communication_admin_note';

  v_areas := v_tech_feedback -> 'areas';
  for v_area in select value from jsonb_array_elements(v_areas)
  loop
    v_score := (v_area ->> 'score')::int;
    if v_score is null or v_score < 0 or v_score > 10 then
      return jsonb_build_object('ok', false, 'error', 'Each topic score must be 0–10');
    end if;

    v_topic_key := nullif(trim(v_area ->> 'key'), '');
    v_topic_label := nullif(trim(v_area ->> 'label'), '');
    if v_topic_key is null or v_topic_label is null then
      return jsonb_build_object('ok', false, 'error', 'Each topic needs a key and label');
    end if;

    v_rating := nullif(trim(v_area ->> 'rating'), '');
    if v_rating not in ('good', 'average', 'needs_work') then
      return jsonb_build_object('ok', false, 'error', 'Each topic needs a rating (good, average, or needs work)');
    end if;

    v_feedback := coalesce(
      nullif(trim(v_area ->> 'feedback'), ''),
      nullif(trim(v_area ->> 'notes'), '')
    );
    v_suggestions := nullif(trim(v_area ->> 'suggestions'), '');

    if length(coalesce(v_feedback, '')) < 20 then
      return jsonb_build_object(
        'ok', false,
        'error', 'Feedback is required for each topic (at least 20 characters): ' || v_topic_label
      );
    end if;
    if length(coalesce(v_suggestions, '')) < 20 then
      return jsonb_build_object(
        'ok', false,
        'error', 'Suggestions are required for each topic (at least 20 characters): ' || v_topic_label
      );
    end if;

    v_count := v_count + 1;
    v_sum := v_sum + v_score;
  end loop;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'Rate at least one interview topic');
  end if;
  if v_count > 10 then
    return jsonb_build_object('ok', false, 'error', 'Maximum 10 topics per mock');
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
    tech_feedback = v_tech_feedback,
    role_fit_keys = v_role_fit,
    placement_recommendation = v_placement,
    placement_recommendation_note = v_placement_note,
    communication_admin_note = v_comm_admin_note,
    technical_score = v_avg,
    problem_solving_score = null,
    feedback_submitted_at = now(),
    status = 'completed',
    completed_at = now()
  where id = p_registration_id;

  delete from public.mock_feedback_topics where mock_registration_id = p_registration_id;

  for v_area in select value from jsonb_array_elements(v_areas)
  loop
    v_topic_key := trim(v_area ->> 'key');
    v_topic_label := trim(v_area ->> 'label');
    v_category := nullif(trim(v_area ->> 'category'), '');
    v_score := (v_area ->> 'score')::int;
    v_rating := trim(v_area ->> 'rating');
    v_feedback := coalesce(
      nullif(trim(v_area ->> 'feedback'), ''),
      nullif(trim(v_area ->> 'notes'), '')
    );
    v_suggestions := trim(v_area ->> 'suggestions');

    insert into public.mock_feedback_topics (
      mock_registration_id,
      aspirant_id,
      topic_key,
      topic_label,
      category,
      score,
      rating,
      feedback,
      suggestions
    ) values (
      p_registration_id,
      v_aspirant_id,
      v_topic_key,
      v_topic_label,
      v_category,
      v_score,
      v_rating,
      v_feedback,
      v_suggestions
    );
  end loop;

  insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
  values (
    null,
    v_aspirant_id,
    'Your mock interview feedback is ready. Check the Mocks page for scores, feedback, and suggestions.',
    p_registration_id
  );

  if v_placement = 'yes' then
    update public.aspirants
    set
      placement_pipeline_status = 'ready',
      placement_ready_at = now(),
      placement_ready_mock_id = p_registration_id
    where id = v_aspirant_id
      and coalesce(profile_status, 'active') = 'active';

    insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
    values (
      null,
      v_aspirant_id,
      'You have been moved to placement-ready status based on your latest mock interview. Our team will reach out with suitable placement opportunities.',
      p_registration_id
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.submit_mock_feedback(uuid, int, int, text, jsonb) is
  'Interviewer/admin: topic feedback + internal notes; yes on placement marks aspirant ready.';

-- When admin marks aspirant placed (inactive), clear placement-ready flag.
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
    placed_at = v_placed_at,
    placement_pipeline_status = case when v_status = 'inactive' then 'none' else placement_pipeline_status end,
    placement_ready_at = case when v_status = 'inactive' then null else placement_ready_at end,
    placement_ready_mock_id = case when v_status = 'inactive' then null else placement_ready_mock_id end
  where id = p_aspirant_id;

  return jsonb_build_object(
    'ok', true,
    'profile_status', v_status,
    'placed_in', v_placed_in,
    'placed_at', v_placed_at
  );
end;
$$;

-- Admin mocks list: include internal feedback fields.
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
      'role_fit_keys', r.role_fit_keys,
      'placement_recommendation', r.placement_recommendation,
      'placement_recommendation_note', r.placement_recommendation_note,
      'communication_admin_note', r.communication_admin_note,
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

-- Admin user profile mock history: include internal feedback fields.
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
      'placed_at', a.placed_at,
      'placement_pipeline_status', coalesce(a.placement_pipeline_status, 'none'),
      'placement_ready_at', a.placement_ready_at
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
            'placement_recommendation', r.placement_recommendation,
            'placement_recommendation_note', r.placement_recommendation_note,
            'communication_admin_note', r.communication_admin_note,
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

comment on function public.get_aspirant_profile_for_admin(uuid) is
  'Admin: full aspirant profile with placement, mock history, and internal interviewer notes.';

-- Admin users list: placement-ready filter + fields.
drop function if exists public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text, numeric, numeric, numeric, text, numeric, numeric, text, text, text, int, int
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
  p_placement_pipeline_status text default null,
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
  v_placement_pipeline text := nullif(trim(lower(coalesce(p_placement_pipeline_status, ''))), '');
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;

  if v_profile_status is not null and v_profile_status not in ('active', 'inactive') then
    v_profile_status := null;
  end if;

  if v_placement_pipeline is not null and v_placement_pipeline not in ('none', 'ready') then
    v_placement_pipeline := null;
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
      'placement_pipeline_status', coalesce(a.placement_pipeline_status, 'none'),
      'placement_ready_at', a.placement_ready_at,
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
      and (v_placement_pipeline is null or coalesce(a.placement_pipeline_status, 'none') = v_placement_pipeline)
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
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text, numeric, numeric, numeric, text, numeric, numeric, text, text, text, text, int, int
) is 'Admin: aspirant list with profile, mock, role-fit, and placement-ready filters.';

grant execute on function public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text, numeric, numeric, numeric, text, numeric, numeric, text, text, text, text, int, int
) to authenticated;
