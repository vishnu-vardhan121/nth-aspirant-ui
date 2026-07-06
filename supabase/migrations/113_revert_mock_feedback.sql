-- Admin: undo mistaken mock feedback — restore registration to scheduled; keep slot, schedule, meet link.

create or replace function public.revert_mock_feedback(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.mock_registrations%rowtype;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if p_registration_id is null then
    return jsonb_build_object('ok', false, 'error', 'Registration id is required');
  end if;

  select * into v_reg
  from public.mock_registrations
  where id = p_registration_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found');
  end if;

  if v_reg.status <> 'completed' then
    return jsonb_build_object('ok', false, 'error', 'Only completed mocks can have feedback reverted');
  end if;

  if v_reg.feedback_submitted_at is null and v_reg.overall_score is null and v_reg.feedback_notes is null then
    return jsonb_build_object('ok', false, 'error', 'This mock has no feedback to revert');
  end if;

  delete from public.mock_feedback_topics
  where mock_registration_id = p_registration_id;

  delete from public.messages
  where mock_registration_id = p_registration_id;

  update public.aspirants
  set
    placement_pipeline_status = 'none',
    placement_ready_at = null,
    placement_ready_mock_id = null
  where placement_ready_mock_id = p_registration_id;

  update public.mock_registrations
  set
    overall_score = null,
    communication_score = null,
    technical_score = null,
    problem_solving_score = null,
    feedback_notes = null,
    tech_feedback = null,
    role_fit_keys = '{}',
    placement_recommendation = null,
    placement_recommendation_note = null,
    communication_admin_note = null,
    feedback_submitted_at = null,
    completed_at = null,
    status = 'scheduled'
  where id = p_registration_id;

  return jsonb_build_object(
    'ok', true,
    'aspirant_id', v_reg.aspirant_id,
    'scheduled_at', v_reg.scheduled_at
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to revert feedback'));
end;
$$;

comment on function public.revert_mock_feedback(uuid) is
  'Admin only: remove feedback and topic rows; set status back to scheduled. Keeps schedule, meet link, slot, interviewer.';

grant execute on function public.revert_mock_feedback(uuid) to authenticated;
