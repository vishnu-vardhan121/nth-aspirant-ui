-- Hotfix: production frontend was still calling the old 2-arg
-- staff_review_course_golden(member_id, approve) after migration 143 dropped it in favor
-- of the 3-arg (reason-required) version. Add the 2-arg overload back so old clients keep
-- working while the new frontend rolls out; it delegates to the 3-arg version with a
-- placeholder reason so the gap is visible in golden_review_reason for later cleanup.
-- Safe to drop this overload once the updated frontend is confirmed deployed everywhere.

create or replace function public.staff_review_course_golden(
  p_member_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.staff_review_course_golden(
    p_member_id,
    p_approve,
    case
      when p_approve then 'Approved (legacy client — no reason captured)'
      else 'Rejected (legacy client — no reason captured)'
    end
  );
end;
$$;

grant execute on function public.staff_review_course_golden(uuid, boolean) to authenticated;
