-- Allow interviewer/admin to update feedback on completed mocks (edit in place).

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
  v_prev_placement text;
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

  select aspirant_id, status, placement_recommendation
  into v_aspirant_id, v_status, v_prev_placement
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

  if v_placement = 'yes' then
    update public.aspirants
    set
      placement_pipeline_status = 'ready',
      placement_ready_at = now(),
      placement_ready_mock_id = p_registration_id
    where id = v_aspirant_id
      and coalesce(profile_status, 'active') = 'active';

    if not v_is_edit or coalesce(v_prev_placement, '') <> 'yes' then
      insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
      values (
        null,
        v_aspirant_id,
        'You have been moved to placement-ready status based on your latest mock interview. Our team will reach out with suitable placement opportunities.',
        p_registration_id
      );
    end if;
  elsif v_is_edit and coalesce(v_prev_placement, '') = 'yes' and v_placement <> 'yes' then
    update public.aspirants
    set
      placement_pipeline_status = 'none',
      placement_ready_at = null,
      placement_ready_mock_id = null
    where id = v_aspirant_id
      and placement_ready_mock_id = p_registration_id
      and coalesce(profile_status, 'active') = 'active';
  end if;

  return jsonb_build_object('ok', true, 'edited', v_is_edit);
end;
$$;

comment on function public.submit_mock_feedback(uuid, int, int, text, jsonb) is
  'Interviewer/admin: submit or edit mock feedback (scheduled or completed).';

-- Interviewer list: include internal fields needed to prefill edit form.
create or replace function public.get_interviewer_mocks(p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if not public.is_interviewer() then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'aspirant_phone', a.phone,
      'scheduled_at', r.scheduled_at,
      'meet_link', r.meet_link,
      'status', r.status,
      'availability_notes', r.availability_notes,
      'technical_score', r.technical_score,
      'communication_score', r.communication_score,
      'problem_solving_score', r.problem_solving_score,
      'overall_score', r.overall_score,
      'feedback_notes', r.feedback_notes,
      'tech_feedback', r.tech_feedback,
      'role_fit_keys', coalesce(r.role_fit_keys, '{}'::text[]),
      'placement_recommendation', r.placement_recommendation,
      'placement_recommendation_note', r.placement_recommendation_note,
      'communication_admin_note', r.communication_admin_note,
      'feedback_submitted_at', r.feedback_submitted_at,
      'completed_at', r.completed_at,
      'created_at', r.created_at
    ) order by
      case r.status when 'requested' then 0 when 'scheduled' then 1 else 2 end,
      case when nullif(trim(coalesce(p_status, '')), '') = 'scheduled' then r.scheduled_at end asc nulls last,
      coalesce(r.scheduled_at, r.created_at) asc nulls last,
      coalesce(r.completed_at, r.created_at) desc nulls last
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  where r.interviewer_id = v_uid
    and (p_status is null or trim(p_status) = '' or r.status = p_status);

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

comment on function public.get_interviewer_mocks(text) is
  'Interviewer: own mocks with feedback fields for edit.';

grant execute on function public.submit_mock_feedback(uuid, int, int, text, jsonb) to authenticated;
grant execute on function public.get_interviewer_mocks(text) to authenticated;
