-- Hotfix: ensure interview readiness accepts frontend values
-- (ready_interviews | average_good | average_poor | not_yet).
-- Old submit_mock_feedback only allowed yes|no|not_yet — so only "Not yet" worked from the UI.

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

  return jsonb_build_object('ok', true, 'edited', v_is_edit);
end;
$$;

comment on function public.submit_mock_feedback(uuid, int, int, text, jsonb) is
  'Submit/edit mock feedback. Interview readiness: ready_interviews | average_good | average_poor | not_yet.';

grant execute on function public.submit_mock_feedback(uuid, int, int, text, jsonb) to authenticated;
