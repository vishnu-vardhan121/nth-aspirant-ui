-- Admin users: multi role-fit (OR) + interview readiness (admin-only options/filter).

drop function if exists public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text,
  numeric, numeric, numeric, text, numeric, numeric, text, text, text, text, int, int
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
  p_role_fit_keys text[] default null,
  p_profile_status text default null,
  p_placement_recommendation text default null,
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
  v_role_fit_keys text[] := '{}';
  v_profile_status text := nullif(trim(lower(coalesce(p_profile_status, ''))), '');
  v_placement_rec text := nullif(trim(lower(coalesce(p_placement_recommendation, ''))), '');
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;

  if v_profile_status is not null and v_profile_status not in ('active', 'inactive') then
    v_profile_status := null;
  end if;

  -- Legacy → current keys; accept only current recommendation values for filter.
  if v_placement_rec = 'yes' then
    v_placement_rec := 'ready_interviews';
  elsif v_placement_rec = 'no' then
    v_placement_rec := 'not_yet';
  end if;
  if v_placement_rec is not null
     and v_placement_rec not in ('ready_interviews', 'average_good', 'average_poor', 'not_yet') then
    v_placement_rec := null;
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

  -- Multi-select role fit (OR). Also accepts legacy single p_role_fit_key.
  select coalesce(array_agg(distinct lower(trim(x))), '{}')
  into v_role_fit_keys
  from (
    select unnest(coalesce(p_role_fit_keys, '{}'::text[])) as x
    union all
    select nullif(trim(coalesce(p_role_fit_key, '')), '')
  ) s(x)
  where nullif(trim(coalesce(x, '')), '') is not null;

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
      'latest_placement_recommendation', latest_mock.placement_recommendation,
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
      select r.overall_score, r.communication_score, r.technical_score, r.completed_at, r.role_fit_keys,
             case
               when r.placement_recommendation = 'yes' then 'ready_interviews'
               when r.placement_recommendation = 'no' then 'not_yet'
               else r.placement_recommendation
             end as placement_recommendation
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
      and (
        v_placement_rec is null
        or exists (
          select 1 from public.mock_registrations r
          where r.aspirant_id = a.id
            and r.status = 'completed'
            and case
              when r.placement_recommendation = 'yes' then 'ready_interviews'
              when r.placement_recommendation = 'no' then 'not_yet'
              else r.placement_recommendation
            end = v_placement_rec
        )
      )
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
      and (
        cardinality(v_role_fit_keys) = 0
        or exists (
          select 1 from public.mock_registrations r
          where r.aspirant_id = a.id
            and r.status = 'completed'
            and coalesce(r.role_fit_keys, '{}') && v_role_fit_keys
        )
      )
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
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text,
  numeric, numeric, numeric, text, numeric, numeric, text, text, text[], text, text, int, int
) is 'Admin: aspirant list with profile, mock, multi role-fit (OR), and interview-readiness filters.';

grant execute on function public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text,
  numeric, numeric, numeric, text, numeric, numeric, text, text, text[], text, text, int, int
) to authenticated;

-- ========== Interview readiness (admin-only) ==========
-- New values: ready_interviews | average_good | average_poor | not_yet
-- Remove aspirant auto placement-ready from interviewer feedback.

alter table public.mock_registrations
  drop constraint if exists mock_registrations_placement_recommendation_check;

update public.mock_registrations
set placement_recommendation = case placement_recommendation
  when 'yes' then 'ready_interviews'
  when 'no' then 'not_yet'
  else placement_recommendation
end
where placement_recommendation in ('yes', 'no');

alter table public.mock_registrations
  add constraint mock_registrations_placement_recommendation_check
  check (
    placement_recommendation is null
    or placement_recommendation in ('ready_interviews', 'average_good', 'average_poor', 'not_yet')
  );

comment on column public.mock_registrations.placement_recommendation is
  'Interviewer admin-only readiness: ready_interviews | average_good | average_poor | not_yet. Not shown to aspirants.';

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
  v_status text;
  v_is_edit boolean;
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
  if v_placement = 'yes' then
    v_placement := 'ready_interviews';
  elsif v_placement = 'no' then
    v_placement := 'not_yet';
  end if;
  if v_placement is null or v_placement not in ('ready_interviews', 'average_good', 'average_poor', 'not_yet') then
    return jsonb_build_object('ok', false, 'error', 'Select interview readiness (admin only)');
  end if;

  v_placement_note := nullif(trim(p_tech_feedback ->> 'placement_recommendation_note'), '');
  if v_placement_note is not null and length(v_placement_note) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'Placement note is too long (max 2000 characters)');
  end if;
  if v_placement in ('average_good', 'average_poor')
     and (v_placement_note is null or length(v_placement_note) < 20) then
    return jsonb_build_object('ok', false, 'error', 'For Average ratings, add a why note (at least 20 characters)');
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

  select aspirant_id, status
  into v_aspirant_id, v_status
  from public.mock_registrations
  where id = p_registration_id
    and status in ('scheduled', 'completed');
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or feedback cannot be submitted');
  end if;

  v_is_edit := (v_status = 'completed');

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
    completed_at = case when v_is_edit then completed_at else now() end
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

  if v_is_edit then
    insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
    values (
      null,
      v_aspirant_id,
      'Your mock interview feedback has been updated. Check the Mocks page for the latest scores and notes.',
      p_registration_id
    );
  else
    insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
    values (
      null,
      v_aspirant_id,
      'Your mock interview feedback is ready. Check the Mocks page for scores, feedback, and suggestions.',
      p_registration_id
    );
  end if;

  -- Admin-only readiness: do not auto-set aspirant placement_pipeline_status or notify aspirant.
  return jsonb_build_object('ok', true, 'edited', v_is_edit);
end;
$$;

comment on function public.submit_mock_feedback(uuid, int, int, text, jsonb) is
  'Submit/edit mock feedback. Interview readiness is admin-only and does not mark aspirants placement-ready.';

-- Job applicants: filter by interview readiness (same options as Users).
drop function if exists public.get_job_applications(
  uuid, text[], text, text, numeric, numeric, numeric, text, numeric, numeric, text, text
);

create or replace function public.get_job_applications(
  p_job_id uuid,
  p_plans text[] default null,
  p_placement_recommendation text default null,
  p_application_status text default null,
  p_mock_overall_min numeric default null,
  p_mock_communication_min numeric default null,
  p_mock_technical_min numeric default null,
  p_mock_topic_key text default null,
  p_mock_topic_score_min numeric default null,
  p_mock_topic_score_max numeric default null,
  p_mock_topic_mode text default 'any',
  p_role_fit_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_topic_key text := nullif(trim(lower(coalesce(p_mock_topic_key, ''))), '');
  v_topic_mode text := lower(coalesce(nullif(trim(p_mock_topic_mode), ''), 'any'));
  v_role_fit_key text := nullif(trim(lower(coalesce(p_role_fit_key, ''))), '');
  v_placement_rec text := nullif(trim(lower(coalesce(p_placement_recommendation, ''))), '');
  v_app_status text := nullif(trim(lower(coalesce(p_application_status, ''))), '');
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;

  if v_placement_rec = 'yes' then
    v_placement_rec := 'ready_interviews';
  elsif v_placement_rec = 'no' then
    v_placement_rec := 'not_yet';
  end if;
  if v_placement_rec is not null
     and v_placement_rec not in ('ready_interviews', 'average_good', 'average_poor', 'not_yet') then
    v_placement_rec := null;
  end if;

  if v_app_status is not null and v_app_status not in ('applied', 'shortlisted', 'rejected') then
    v_app_status := null;
  end if;

  if v_topic_mode not in ('any', 'latest', 'best') then
    v_topic_mode := 'any';
  end if;

  select coalesce(jsonb_agg(row order by row->>'created_at' desc), '[]'::jsonb)
  into v_rows
  from (
    select jsonb_build_object(
      'id', app.id,
      'aspirant_id', app.aspirant_id,
      'aspirant_name', p.full_name,
      'aspirant_email', p.email,
      'aspirant_phone', p.phone,
      'aspirant_city', p.city,
      'aspirant_education', p.education,
      'aspirant_skills', p.skills,
      'aspirant_resume_url', p.resume_url,
      'aspirant_highest_qualification', p.highest_qualification,
      'aspirant_degree_branch', p.degree_branch,
      'aspirant_degree_branch_other', p.degree_branch_other,
      'aspirant_graduation_year', coalesce(p.graduation_year, p.expected_graduation_year),
      'aspirant_graduation_score', p.graduation_score,
      'aspirant_graduation_score_type', p.graduation_score_type,
      'aspirant_college_name', p.college_name,
      'aspirant_institute_tier', p.institute_tier,
      'created_at', app.created_at,
      'status', app.status,
      'plan', p.plan,
      'track', coalesce(p.track, 'fresher'),
      'profile_status', coalesce(p.profile_status, 'active'),
      'placement_pipeline_status', coalesce(p.placement_pipeline_status, 'none'),
      'placement_ready_at', p.placement_ready_at,
      'placed_in', p.placed_in,
      'latest_placement_recommendation', lm.placement_recommendation,
      'mocks_completed_total', (
        select count(*)::int from public.mock_registrations r
        where r.aspirant_id = p.id and r.status = 'completed'
      ),
      'latest_mock_overall', lm.overall_score,
      'latest_mock_communication', lm.communication_score,
      'latest_mock_technical', lm.technical_score,
      'latest_mock_completed_at', lm.completed_at,
      'latest_mock_role_fit_keys', lm.role_fit_keys,
      'all_mock_role_fit_keys', (
        select coalesce(array_agg(distinct rf.key), '{}')
        from public.mock_registrations r
        cross join lateral unnest(coalesce(r.role_fit_keys, '{}')) as rf(key)
        where r.aspirant_id = p.id and r.status = 'completed'
      )
    ) as row
    from public.applications app
    join public.aspirants p on p.id = app.aspirant_id
    left join lateral (
      select r.overall_score, r.communication_score, r.technical_score, r.completed_at, r.role_fit_keys,
             case
               when r.placement_recommendation = 'yes' then 'ready_interviews'
               when r.placement_recommendation = 'no' then 'not_yet'
               else r.placement_recommendation
             end as placement_recommendation
      from public.mock_registrations r
      where r.aspirant_id = p.id and r.status = 'completed'
      order by r.completed_at desc nulls last
      limit 1
    ) lm on true
    where app.job_id = p_job_id
      and (p_plans is null or cardinality(p_plans) = 0 or p.plan = any (p_plans))
      and (
        v_placement_rec is null
        or exists (
          select 1 from public.mock_registrations r
          where r.aspirant_id = p.id
            and r.status = 'completed'
            and case
              when r.placement_recommendation = 'yes' then 'ready_interviews'
              when r.placement_recommendation = 'no' then 'not_yet'
              else r.placement_recommendation
            end = v_placement_rec
        )
      )
      and (v_app_status is null or app.status = v_app_status)
      and (p_mock_overall_min is null or (lm.overall_score is not null and lm.overall_score >= p_mock_overall_min))
      and (p_mock_communication_min is null or (lm.communication_score is not null and lm.communication_score >= p_mock_communication_min))
      and (p_mock_technical_min is null or (lm.technical_score is not null and lm.technical_score >= p_mock_technical_min))
      and (v_topic_key is null or (
        (v_topic_mode = 'any' and exists (
          select 1 from public.mock_feedback_topics t
          inner join public.mock_registrations r on r.id = t.mock_registration_id and r.status = 'completed'
          where t.aspirant_id = p.id and t.topic_key = v_topic_key
            and (p_mock_topic_score_min is null or t.score >= p_mock_topic_score_min)
            and (p_mock_topic_score_max is null or t.score <= p_mock_topic_score_max)
        ))
        or (v_topic_mode = 'latest' and exists (
          select 1 from public.mock_feedback_topics t
          inner join public.mock_registrations r on r.id = t.mock_registration_id
          where t.aspirant_id = p.id and t.topic_key = v_topic_key and r.status = 'completed'
            and r.id = (
              select r2.id from public.mock_registrations r2
              where r2.aspirant_id = p.id and r2.status = 'completed'
              order by r2.completed_at desc nulls last
              limit 1
            )
            and (p_mock_topic_score_min is null or t.score >= p_mock_topic_score_min)
            and (p_mock_topic_score_max is null or t.score <= p_mock_topic_score_max)
        ))
        or (v_topic_mode = 'best' and coalesce((
          select max(t.score)::numeric from public.mock_feedback_topics t
          inner join public.mock_registrations r on r.id = t.mock_registration_id and r.status = 'completed'
          where t.aspirant_id = p.id and t.topic_key = v_topic_key
        ), -1) >= coalesce(p_mock_topic_score_min, 0)
        and coalesce((
          select max(t.score)::numeric from public.mock_feedback_topics t
          inner join public.mock_registrations r on r.id = t.mock_registration_id and r.status = 'completed'
          where t.aspirant_id = p.id and t.topic_key = v_topic_key
        ), -1) <= coalesce(p_mock_topic_score_max, 10))
      ))
      and (v_role_fit_key is null or exists (
        select 1 from public.mock_registrations r
        where r.aspirant_id = p.id
          and r.status = 'completed'
          and v_role_fit_key = any (coalesce(r.role_fit_keys, '{}'))
      ))
  ) sub;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

comment on function public.get_job_applications(
  uuid, text[], text, text, numeric, numeric, numeric, text, numeric, numeric, text, text
) is 'Admin: job applicants with plan, interview-readiness, and mock filters.';

grant execute on function public.get_job_applications(
  uuid, text[], text, text, numeric, numeric, numeric, text, numeric, numeric, text, text
) to authenticated;
