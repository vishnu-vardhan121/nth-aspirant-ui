-- Use single role column: 'super admin', 'admin', 'assistant admin', 'interviewer'.
-- Interviewer is a role; remove is_interviewer column (if it exists from 031).

-- ========== 1) Migrate and drop is_interviewer only if column exists ==========
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'admins' and column_name = 'is_interviewer'
  ) then
    update public.admins set role = 'interviewer' where is_interviewer = true;
    alter table public.admins drop column is_interviewer;
  end if;
end $$;

-- ========== 3) is_interviewer() checks role = 'interviewer' ==========
create or replace function public.is_interviewer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where id = auth.uid() and role = 'interviewer');
$$;

-- ========== 4) get_interviewers_list: admins where role = 'interviewer' ==========
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
    from public.admins
    where role = 'interviewer'
  );
end;
$$;

-- ========== 5) create_mock_slots: require admin with role = 'interviewer' ==========
create or replace function public.create_mock_slots(
  p_interviewer_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_slot_duration_mins int default 25,
  p_meet_link text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t timestamptz := p_start_at;
  v_end timestamptz;
  v_dur interval := (p_slot_duration_mins || ' minutes')::interval;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_end_at is null or p_start_at is null or p_end_at <= p_start_at then
    return jsonb_build_object('ok', false, 'error', 'Invalid time window');
  end if;
  if p_slot_duration_mins is null or p_slot_duration_mins < 15 or p_slot_duration_mins > 60 then
    return jsonb_build_object('ok', false, 'error', 'Slot duration must be 15-60 minutes');
  end if;
  if not exists (select 1 from public.admins where id = p_interviewer_id and role = 'interviewer') then
    return jsonb_build_object('ok', false, 'error', 'Interviewer not found');
  end if;

  while v_t + v_dur <= p_end_at loop
    v_end := v_t + v_dur;
    insert into public.mock_slots (interviewer_id, start_at, end_at, status, meet_link)
    values (p_interviewer_id, v_t, v_end, 'available', nullif(trim(p_meet_link), ''))
    on conflict (interviewer_id, start_at) do nothing;
    v_t := v_end;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 6) get_available_mock_slots: join admins where role = 'interviewer' ==========
create or replace function public.get_available_mock_slots(p_from_date date default null, p_to_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := coalesce(p_from_date, current_date);
  v_to date := coalesce(p_to_date, current_date + 14);
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'start_at', s.start_at,
      'end_at', s.end_at,
      'interviewer_name', a.name,
      'meet_link', s.meet_link
    ) order by s.start_at
  ), '[]'::jsonb) into v_rows
  from public.mock_slots s
  join public.admins a on a.id = s.interviewer_id and a.role = 'interviewer'
  where s.status = 'available'
    and s.start_at >= now()
    and s.start_at::date >= v_from
    and s.start_at::date <= v_to;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
