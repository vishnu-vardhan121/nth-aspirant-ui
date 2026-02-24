-- Admin: list all mock slots (to view, reschedule, or cancel). Optional date range and interviewer filter.

create or replace function public.get_admin_mock_slots(
  p_from_date date default null,
  p_to_date date default null,
  p_interviewer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := coalesce(p_from_date, current_date);
  v_to date := coalesce(p_to_date, current_date + 30);
  v_rows jsonb;
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'start_at', s.start_at,
      'end_at', s.end_at,
      'status', s.status,
      'meet_link', s.meet_link,
      'interviewer_id', s.interviewer_id,
      'interviewer_name', a.name,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', asp.full_name,
      'aspirant_email', asp.email,
      'registration_id', r.id
    ) order by s.start_at
  ), '[]'::jsonb) into v_rows
  from public.mock_slots s
  join public.admins a on a.id = s.interviewer_id
  left join public.mock_registrations r on r.slot_id = s.id and r.status = 'scheduled'
  left join public.aspirants asp on asp.id = r.aspirant_id
  where s.start_at::date >= v_from
    and s.start_at::date <= v_to
    and (p_interviewer_id is null or s.interviewer_id = p_interviewer_id);
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
