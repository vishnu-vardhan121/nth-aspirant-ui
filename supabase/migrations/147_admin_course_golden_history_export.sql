-- Admin export: every course_members row for a course (any status), with contact +
-- education fields joined in, so admin can download a full picture of requests/status
-- for the Golden Batch panel (not just the pending queue shown in the UI).

create or replace function public.admin_list_course_golden_history(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      cm.id,
      cm.status,
      cm.access_state,
      cm.reason,
      cm.golden_request_reason,
      cm.golden_requested_at,
      cm.golden_review_reason,
      cm.golden_reviewed_at,
      cm.golden_partial_reason,
      cm.golden_partial_approved_at,
      pa.name as golden_partial_approved_by_name,
      cm.chosen_pack,
      cm.installments_paid,
      cm.installments_total,
      cm.joined_at,
      cm.created_at,
      a.full_name as aspirant_name,
      a.email as aspirant_email,
      a.phone as aspirant_phone,
      a.highest_qualification,
      a.degree_branch,
      a.degree_branch_other,
      a.college_name,
      a.graduation_year
    from public.course_members cm
    join public.aspirants a on a.id = cm.aspirant_id
    left join public.admins pa on pa.id = cm.golden_partial_approved_by
    where cm.course_id = p_course_id
    order by cm.created_at desc
    limit 2000
  ) t;

  return jsonb_build_object('ok', true, 'members', v_rows);
end;
$$;

grant execute on function public.admin_list_course_golden_history(uuid) to authenticated;
