-- Admin: list interviewers (for create-slots dropdown).
create or replace function public.get_interviewers_list()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'email', email) order by name), '[]'::jsonb)
    from public.interviewers
  );
end;
$$;
