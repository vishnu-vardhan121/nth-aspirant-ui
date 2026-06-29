-- Topic-level mock feedback (filterable rows) + v2 structured JSON on mock_registrations.

create table if not exists public.mock_feedback_topics (
  id uuid primary key default gen_random_uuid(),
  mock_registration_id uuid not null references public.mock_registrations(id) on delete cascade,
  aspirant_id uuid not null references public.aspirants(id) on delete cascade,
  topic_key text not null,
  topic_label text not null,
  category text,
  score int not null check (score >= 0 and score <= 10),
  rating text not null check (rating in ('good', 'average', 'needs_work')),
  feedback text not null,
  suggestions text not null,
  created_at timestamptz not null default now(),
  unique (mock_registration_id, topic_key)
);

create index if not exists mock_feedback_topics_topic_score_idx
  on public.mock_feedback_topics (topic_key, score);

create index if not exists mock_feedback_topics_aspirant_topic_score_idx
  on public.mock_feedback_topics (aspirant_id, topic_key, score desc);

create index if not exists mock_feedback_topics_registration_idx
  on public.mock_feedback_topics (mock_registration_id);

comment on table public.mock_feedback_topics is
  'One row per topic rated in a completed mock — used for admin filters (e.g. React score 8–10).';

alter table public.mock_feedback_topics enable row level security;

drop policy if exists "mock_feedback_topics_select_admin" on public.mock_feedback_topics;
create policy "mock_feedback_topics_select_admin"
  on public.mock_feedback_topics for select to authenticated
  using (public.is_admin());

drop policy if exists "mock_feedback_topics_select_aspirant" on public.mock_feedback_topics;
create policy "mock_feedback_topics_select_aspirant"
  on public.mock_feedback_topics for select to authenticated
  using (aspirant_id = auth.uid());

-- Backfill from legacy tech_feedback JSON (notes → feedback; no suggestions).
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
)
select
  r.id,
  r.aspirant_id,
  coalesce(nullif(trim(elem->>'key'), ''), 'legacy_' || substr(md5(coalesce(elem->>'label', '')), 1, 12)),
  coalesce(nullif(trim(elem->>'label'), ''), 'Topic'),
  nullif(trim(elem->>'category'), ''),
  (elem->>'score')::int,
  case
    when (elem->>'score')::int >= 8 then 'good'
    when (elem->>'score')::int >= 5 then 'average'
    else 'needs_work'
  end,
  coalesce(nullif(trim(elem->>'feedback'), ''), nullif(trim(elem->>'notes'), ''), 'Legacy feedback'),
  coalesce(nullif(trim(elem->>'suggestions'), ''), 'See overall mock feedback for details.')
from public.mock_registrations r
cross join lateral jsonb_array_elements(r.tech_feedback->'areas') elem
where r.status = 'completed'
  and r.tech_feedback is not null
  and jsonb_typeof(r.tech_feedback->'areas') = 'array'
  and (elem->>'score') ~ '^[0-9]+$'
  and not exists (
    select 1 from public.mock_feedback_topics t where t.mock_registration_id = r.id
  )
on conflict (mock_registration_id, topic_key) do nothing;

-- ========== submit_mock_feedback v2 ==========
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

  v_areas := p_tech_feedback -> 'areas';
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
  if v_count > 6 then
    return jsonb_build_object('ok', false, 'error', 'Maximum 6 topics per mock');
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

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.submit_mock_feedback(uuid, int, int, text, jsonb) is
  'Interviewer/admin: v2 topic feedback (feedback + suggestions per topic) + filterable rows.';

-- ========== Admin users list: topic + score filters ==========
drop function if exists public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text, numeric, numeric, numeric, int, int
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
      'mock_month_end', mb.period_end,
      'latest_mock_overall', latest_mock.overall_score,
      'latest_mock_communication', latest_mock.communication_score,
      'latest_mock_technical', latest_mock.technical_score,
      'latest_mock_completed_at', latest_mock.completed_at,
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
      select r.overall_score, r.communication_score, r.technical_score, r.completed_at
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
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text, numeric, numeric, numeric, text, numeric, numeric, text, int, int
) is 'Admin: aspirant list with profile, mock, and topic score filters.';

grant execute on function public.get_admin_users_list(
  text, text, text, text, text, text, int, numeric, text, text, text, text, text, text, numeric, numeric, numeric, text, numeric, numeric, text, int, int
) to authenticated;
