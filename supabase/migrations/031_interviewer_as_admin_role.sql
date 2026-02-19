-- Interviewer as a role of admin user (no separate interviewers table).
-- (1) Add is_interviewer to admins
-- (2) Migrate existing interviewers into admins, set is_interviewer = true
-- (3) Point mock_slots.interviewer_id and mock_registrations.interviewer_id to admins
-- (4) Drop interviewers table
-- (5) Update is_interviewer(), get_interviewers_list, and RPCs that join interviewers

-- ========== 1) Add is_interviewer to admins ==========
alter table public.admins
  add column if not exists is_interviewer boolean not null default false;

comment on column public.admins.is_interviewer is 'When true, this admin can conduct mock interviews (interviewer app and slot assignment).';

-- ========== 2) Migrate: ensure every interviewer exists as admin with is_interviewer = true ==========
insert into public.admins (id, name, email, role, is_interviewer, created_at, updated_at)
select i.id, i.name, i.email, 'admin', true, i.created_at, i.updated_at
from public.interviewers i
where not exists (select 1 from public.admins a where a.id = i.id)
on conflict (id) do update set is_interviewer = true;

update public.admins a
set is_interviewer = true
where a.id in (select id from public.interviewers);

-- ========== 3) Point FKs to admins ==========
-- mock_slots: drop FK to interviewers, add FK to admins
alter table public.mock_slots
  drop constraint if exists mock_slots_interviewer_id_fkey;

alter table public.mock_slots
  add constraint mock_slots_interviewer_id_fkey
  foreign key (interviewer_id) references public.admins(id) on delete cascade;

-- mock_registrations: drop FK to interviewers, add FK to admins
alter table public.mock_registrations
  drop constraint if exists mock_registrations_interviewer_id_fkey;

alter table public.mock_registrations
  add constraint mock_registrations_interviewer_id_fkey
  foreign key (interviewer_id) references public.admins(id) on delete set null;

-- ========== 4) Drop interviewers table (policies and trigger go with it) ==========
drop table if exists public.interviewers;

-- ========== 5) is_interviewer() now checks admins ==========
create or replace function public.is_interviewer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where id = auth.uid() and is_interviewer = true);
$$;

-- ========== 6) get_interviewers_list: admins where is_interviewer = true ==========
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
    where is_interviewer = true
  );
end;
$$;

-- ========== 7) create_mock_slots: require admin with is_interviewer = true ==========
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
  if not exists (select 1 from public.admins where id = p_interviewer_id and is_interviewer = true) then
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

-- ========== 8) get_available_mock_slots: join admins for name ==========
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
  join public.admins a on a.id = s.interviewer_id and a.is_interviewer = true
  where s.status = 'available'
    and s.start_at >= now()
    and s.start_at::date >= v_from
    and s.start_at::date <= v_to;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== 9) get_admin_mock_registrations: join admins for interviewer_name ==========
create or replace function public.get_admin_mock_registrations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_summary jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('registrations', '[]'::jsonb, 'by_aspirant', '{}'::jsonb);
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'created_at', r.created_at,
      'availability_notes', r.availability_notes,
      'scheduled_at', r.scheduled_at,
      'meet_link', r.meet_link,
      'admin_notes', r.admin_notes,
      'completed_at', r.completed_at,
      'status', r.status,
      'slot_id', r.slot_id,
      'interviewer_id', r.interviewer_id,
      'interviewer_name', adm.name,
      'technical_score', r.technical_score,
      'communication_score', r.communication_score,
      'problem_solving_score', r.problem_solving_score,
      'overall_score', r.overall_score,
      'feedback_notes', r.feedback_notes,
      'feedback_submitted_at', r.feedback_submitted_at
    ) order by r.created_at desc
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  left join public.admins adm on adm.id = r.interviewer_id;

  select jsonb_object_agg(aspirant_id, conducted_count)
  into v_summary
  from (
    select aspirant_id, count(*)::int as conducted_count
    from public.mock_registrations
    where status = 'completed'
    group by aspirant_id
  ) s;

  return jsonb_build_object(
    'registrations', coalesce(v_rows, '[]'::jsonb),
    'by_aspirant', coalesce(v_summary, '{}'::jsonb)
  );
end;
$$;

-- ========== 10) get_admin_mocks_completed_report: join admins ==========
create or replace function public.get_admin_mocks_completed_report(p_from_date date default null, p_to_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_from date := coalesce(p_from_date, current_date - 30);
  v_to date := coalesce(p_to_date, current_date);
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'created_at', r.created_at,
      'scheduled_at', r.scheduled_at,
      'completed_at', r.completed_at,
      'meet_link', r.meet_link,
      'status', r.status,
      'interviewer_id', r.interviewer_id,
      'interviewer_name', adm.name,
      'technical_score', r.technical_score,
      'communication_score', r.communication_score,
      'problem_solving_score', r.problem_solving_score,
      'overall_score', r.overall_score,
      'feedback_notes', r.feedback_notes
    ) order by coalesce(r.completed_at, r.scheduled_at, r.created_at) desc
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  left join public.admins adm on adm.id = r.interviewer_id
  where r.status = 'completed'
    and (r.completed_at::date between v_from and v_to
         or (r.completed_at is null and r.scheduled_at is not null and r.scheduled_at::date between v_from and v_to)
         or (r.completed_at is null and r.scheduled_at is null and r.created_at::date between v_from and v_to));
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
