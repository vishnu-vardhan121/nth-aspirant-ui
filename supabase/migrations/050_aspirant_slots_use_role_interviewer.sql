-- Aspirant slot list uses admins join; if admins has role = 'interviewer' (no is_interviewer column),
-- the join on is_interviewer = true returns no rows. Use role = 'interviewer' so aspirants see slots.

create or replace function public.get_available_mock_slots(p_from_date date default null, p_to_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := coalesce(p_from_date, current_date);
  v_to date := coalesce(p_to_date, current_date + 14);
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'start_at', s.start_at,
      'end_at', s.end_at,
      'interviewer_name', a.name,
      'meet_link', s.meet_link,
      'booked_by_me', (r.id is not null)
    ) order by s.start_at
  ), '[]'::jsonb) into v_rows
  from public.mock_slots s
  join public.admins a on a.id = s.interviewer_id and a.role = 'interviewer'
  left join public.mock_registrations r on r.slot_id = s.id and r.aspirant_id = v_uid and r.status = 'scheduled'
  where s.start_at >= now()
    and s.start_at::date >= v_from
    and s.start_at::date <= v_to
    and (
      s.status = 'available'
      or (s.status = 'booked' and r.id is not null)
    );
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
