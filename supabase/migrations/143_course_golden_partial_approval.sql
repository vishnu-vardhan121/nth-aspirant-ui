-- Golden Batch review: require a reason on the final approve/reject decision, and add an
-- internal "partial approval" step (admin or interviewer, with reason) that's a recommendation
-- only — it does not grant access by itself. The final approve/reject (either role) still decides.

alter table public.course_members
  add column if not exists golden_review_reason text,
  add column if not exists golden_partial_approved_by uuid references public.admins(id) on delete set null,
  add column if not exists golden_partial_approved_at timestamptz,
  add column if not exists golden_partial_reason text;

comment on column public.course_members.golden_review_reason is
  'Reason given by whoever made the final Golden approve/reject decision.';
comment on column public.course_members.golden_partial_approved_by is
  'Admin or interviewer who gave an internal partial approval before the final decision.';
comment on column public.course_members.golden_partial_reason is
  'Reason text for the partial approval (internal only, not shown to aspirant).';

-- Final review now requires a reason — replace the 2-arg version with a 3-arg version.
drop function if exists public.staff_review_course_golden(uuid, boolean);

create or replace function public.staff_review_course_golden(
  p_member_id uuid,
  p_approve boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.course_members%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if p_member_id is null then
    return jsonb_build_object('ok', false, 'error', 'member_id required');
  end if;
  if p_approve is null then
    return jsonb_build_object('ok', false, 'error', 'approve required');
  end if;
  if char_length(v_reason) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Reason is required');
  end if;

  select * into v_member from public.course_members where id = p_member_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found');
  end if;
  if v_member.status is distinct from 'golden_requested' then
    return jsonb_build_object('ok', false, 'error', 'Not a pending Golden request');
  end if;

  if p_approve then
    update public.course_members
    set
      status = 'golden',
      access_state = 'awaiting_payment',
      golden_reviewed_by = auth.uid(),
      golden_reviewed_at = now(),
      golden_review_reason = v_reason,
      updated_at = now()
    where id = p_member_id
    returning * into v_member;
  else
    update public.course_members
    set
      status = 'golden_rejected',
      access_state = 'none',
      golden_reviewed_by = auth.uid(),
      golden_reviewed_at = now(),
      golden_review_reason = v_reason,
      updated_at = now()
    where id = p_member_id
    returning * into v_member;
  end if;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member.id,
    'status', v_member.status,
    'access_state', v_member.access_state
  );
end;
$$;

-- Partial approval: internal recommendation only (admin or interviewer). Doesn't grant access;
-- request stays golden_requested until someone makes the final call via staff_review_course_golden.
create or replace function public.staff_partial_approve_course_golden(
  p_member_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.course_members%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if p_member_id is null then
    return jsonb_build_object('ok', false, 'error', 'member_id required');
  end if;
  if char_length(v_reason) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Reason is required');
  end if;

  select * into v_member from public.course_members where id = p_member_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found');
  end if;
  if v_member.status is distinct from 'golden_requested' then
    return jsonb_build_object('ok', false, 'error', 'Not a pending Golden request');
  end if;

  update public.course_members
  set
    golden_partial_approved_by = auth.uid(),
    golden_partial_approved_at = now(),
    golden_partial_reason = v_reason,
    updated_at = now()
  where id = p_member_id
  returning * into v_member;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member.id,
    'golden_partial_approved_at', v_member.golden_partial_approved_at
  );
end;
$$;

-- List requests: expose partial-approval fields + reviewer name/role for display.
create or replace function public.staff_list_course_golden_requests(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.golden_requested_at asc nulls last), '[]'::jsonb)
  into v_rows
  from (
    select
      cm.id,
      cm.course_id,
      cm.aspirant_id,
      cm.status,
      cm.access_state,
      cm.golden_request_reason,
      cm.golden_requested_at,
      cm.golden_partial_approved_at,
      cm.golden_partial_reason,
      pa.name as golden_partial_approved_by_name,
      pa.role as golden_partial_approved_by_role,
      cm.created_at,
      a.full_name as aspirant_name,
      a.email as aspirant_email,
      a.phone as aspirant_phone,
      a.track as aspirant_track,
      a.plan as aspirant_plan
    from public.course_members cm
    join public.aspirants a on a.id = cm.aspirant_id
    left join public.admins pa on pa.id = cm.golden_partial_approved_by
    where cm.course_id = p_course_id
      and cm.status = 'golden_requested'
    order by cm.golden_requested_at asc nulls last
    limit 500
  ) t;

  return jsonb_build_object('ok', true, 'requests', v_rows);
end;
$$;

grant execute on function public.staff_review_course_golden(uuid, boolean, text) to authenticated;
grant execute on function public.staff_partial_approve_course_golden(uuid, text) to authenticated;
grant execute on function public.staff_list_course_golden_requests(uuid) to authenticated;
