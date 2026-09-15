-- Add an optional server-side status filter to the Join requests and Golden requests
-- lists, so admin/interviewer can view Rejected / Approved / All, not just the pending
-- queue. New param is appended with a default matching today's behavior exactly, so any
-- already-deployed frontend calling with just (course_id) keeps working unchanged.

drop function if exists public.admin_list_course_join_requests(uuid);

create or replace function public.admin_list_course_join_requests(
  p_course_id uuid default null,
  p_status text default 'requested'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if v_status is null then
    v_status := 'requested';
  end if;
  if v_status not in ('requested', 'free', 'rejected', 'all') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status filter');
  end if;

  return jsonb_build_object(
    'ok', true,
    'requests', coalesce((
      select jsonb_agg(to_jsonb(t) order by
        case when v_status = 'requested' then t.created_at end asc,
        case when v_status <> 'requested' then coalesce(t.reviewed_at, t.created_at) end desc
      )
      from (
        select
          cm.id,
          cm.course_id,
          cm.aspirant_id,
          cm.status,
          cm.reason,
          cm.created_at,
          cm.updated_at,
          cm.reviewed_at,
          c.code as course_code,
          c.title as course_title,
          a.full_name as aspirant_name,
          a.email as aspirant_email,
          a.phone as aspirant_phone,
          a.track as aspirant_track,
          a.plan as aspirant_plan
        from public.course_members cm
        join public.courses c on c.id = cm.course_id
        join public.aspirants a on a.id = cm.aspirant_id
        where (p_course_id is null or cm.course_id = p_course_id)
          and (
            v_status = 'all' and cm.status in ('requested', 'free', 'rejected')
            or v_status <> 'all' and cm.status = v_status
          )
        limit 500
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_list_course_join_requests(uuid, text) to authenticated;

drop function if exists public.staff_list_course_golden_requests(uuid);

create or replace function public.staff_list_course_golden_requests(
  p_course_id uuid,
  p_status text default 'golden_requested'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
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
  if v_status is null then
    v_status := 'golden_requested';
  end if;
  if v_status not in ('golden_requested', 'golden', 'golden_rejected', 'all') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status filter');
  end if;

  return jsonb_build_object(
    'ok', true,
    'requests', coalesce((
      select jsonb_agg(to_jsonb(t) order by
        case when v_status = 'golden_requested' then t.golden_requested_at end asc nulls last,
        case when v_status <> 'golden_requested'
          then coalesce(t.golden_reviewed_at, t.golden_requested_at, t.created_at)
        end desc
      )
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
          cm.golden_review_reason,
          cm.golden_reviewed_at,
          ra.name as golden_reviewed_by_name,
          cm.created_at,
          a.full_name as aspirant_name,
          a.email as aspirant_email,
          a.phone as aspirant_phone,
          a.track as aspirant_track,
          a.plan as aspirant_plan
        from public.course_members cm
        join public.aspirants a on a.id = cm.aspirant_id
        left join public.admins pa on pa.id = cm.golden_partial_approved_by
        left join public.admins ra on ra.id = cm.golden_reviewed_by
        where cm.course_id = p_course_id
          and (
            v_status = 'all' and cm.status in ('golden_requested', 'golden', 'golden_rejected')
            or v_status <> 'all' and cm.status = v_status
          )
        limit 500
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.staff_list_course_golden_requests(uuid, text) to authenticated;
