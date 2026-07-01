-- Job applicants: filters + mock/placement fields (admin job applicants page).

drop function if exists public.get_job_applications(uuid);

create or replace function public.get_job_applications(
  p_job_id uuid,
  p_plans text[] default null,
  p_placement_pipeline_status text default null,
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
  v_placement text := nullif(trim(lower(coalesce(p_placement_pipeline_status, ''))), '');
  v_app_status text := nullif(trim(lower(coalesce(p_application_status, ''))), '');
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;

  if v_placement is not null and v_placement not in ('none', 'ready') then
    v_placement := null;
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
      'created_at', app.created_at,
      'status', app.status,
      'plan', p.plan,
      'track', coalesce(p.track, 'fresher'),
      'profile_status', coalesce(p.profile_status, 'active'),
      'placement_pipeline_status', coalesce(p.placement_pipeline_status, 'none'),
      'placement_ready_at', p.placement_ready_at,
      'placed_in', p.placed_in,
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
      select r.overall_score, r.communication_score, r.technical_score, r.completed_at, r.role_fit_keys
      from public.mock_registrations r
      where r.aspirant_id = p.id and r.status = 'completed'
      order by r.completed_at desc nulls last
      limit 1
    ) lm on true
    where app.job_id = p_job_id
      and (p_plans is null or cardinality(p_plans) = 0 or p.plan = any (p_plans))
      and (v_placement is null or coalesce(p.placement_pipeline_status, 'none') = v_placement)
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
) is 'Admin: job applicants with plan, placement, and mock filters (like users list).';

grant execute on function public.get_job_applications(
  uuid, text[], text, text, numeric, numeric, numeric, text, numeric, numeric, text, text
) to authenticated;
