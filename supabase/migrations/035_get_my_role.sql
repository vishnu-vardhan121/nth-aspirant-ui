-- Role resolution for post-login redirect: aspirant → admin → interviewer (admin with role=interviewer).
-- Returns { "role": "aspirant" | "admin" | "interviewer" | null }.

create or replace function public.get_my_role()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('role', null);
  end if;
  if exists (select 1 from public.aspirants where id = v_uid) then
    return jsonb_build_object('role', 'aspirant');
  end if;
  if exists (select 1 from public.admins where id = v_uid and role = 'interviewer') then
    return jsonb_build_object('role', 'interviewer');
  end if;
  if exists (select 1 from public.admins where id = v_uid) then
    return jsonb_build_object('role', 'admin');
  end if;
  return jsonb_build_object('role', null);
end;
$$;
