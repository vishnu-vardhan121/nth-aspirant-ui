-- Mock scheduling (date, time, Meet link), completed_at, and mock-related messages in Messages + Mocks page.
-- Run after 014 (messages), 016 (from_aspirant_id), 013 (mock_registrations availability_notes).

-- ========== 1) mock_registrations: scheduling + completed_at ==========
alter table public.mock_registrations
  add column if not exists scheduled_at timestamptz,
  add column if not exists meet_link text,
  add column if not exists admin_notes text,
  add column if not exists completed_at timestamptz;

comment on column public.mock_registrations.scheduled_at is 'When the mock is scheduled (set by admin).';
comment on column public.mock_registrations.meet_link is 'Google Meet or other join link.';
comment on column public.mock_registrations.admin_notes is 'Internal notes (e.g. rescheduled).';
comment on column public.mock_registrations.completed_at is 'When admin marked the mock as completed.';

-- ========== 2) messages: link to mock (so mock notices appear in Messages and on Mocks page) ==========
alter table public.messages
  add column if not exists mock_registration_id uuid references public.mock_registrations(id) on delete set null;

comment on column public.messages.mock_registration_id is 'When set, this message is a mock-related notice (schedule/completed).';

-- ========== 3) send_message: optional mock_registration_id ==========
create or replace function public.send_message(
  p_to_aspirant_id uuid,
  p_subject text,
  p_body text,
  p_job_id uuid default null,
  p_mock_registration_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_body is null or trim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'Message body required');
  end if;
  insert into public.messages (from_admin_id, to_aspirant_id, job_id, body, subject, mock_registration_id)
  values (auth.uid(), p_to_aspirant_id, p_job_id, trim(p_body), nullif(trim(coalesce(p_subject, '')), ''), p_mock_registration_id);
  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 4) get_my_messages: include mock_registration_id (for Messages page; Mocks page uses get_my_mock_notices) ==========
create or replace function public.get_my_messages()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;
  select jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'subject', m.subject,
      'body', m.body,
      'created_at', m.created_at,
      'job_id', m.job_id,
      'job_title', j.title,
      'company_name', j.company_name,
      'from_me', m.from_aspirant_id = v_uid,
      'read_at', m.read_at,
      'admin_read_at', m.admin_read_at,
      'mock_registration_id', m.mock_registration_id,
      'source', case
        when m.from_aspirant_id = v_uid then case when m.job_id is not null then 'job_group' else 'personal' end
        when m.batch_id is not null then 'job_group'
        when m.job_id is not null then 'job_group'
        when m.to_aspirant_id is null then 'platform'
        else 'personal'
      end
    ) order by m.created_at asc
  ) into v_rows
  from public.messages m
  left join public.jobs j on j.id = m.job_id
  where (m.to_aspirant_id = v_uid or (m.to_aspirant_id is null and m.from_admin_id is not null))
     or m.from_aspirant_id = v_uid;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== 5) Aspirant: mock-related notices (for Mocks page "Notices" section) ==========
create or replace function public.get_my_mock_notices()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'body', m.body,
      'created_at', m.created_at,
      'mock_registration_id', m.mock_registration_id,
      'read_at', m.read_at
    ) order by m.created_at desc
  ), '[]'::jsonb) into v_rows
  from public.messages m
  where m.to_aspirant_id = v_uid and m.mock_registration_id is not null;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== 6) Admin: set schedule for a mock (date, time, Meet link, notes) ==========
create or replace function public.admin_schedule_mock(
  p_registration_id uuid,
  p_scheduled_at timestamptz,
  p_meet_link text default null,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  update public.mock_registrations
  set scheduled_at = p_scheduled_at,
      meet_link = nullif(trim(p_meet_link), ''),
      admin_notes = nullif(trim(p_admin_notes), '')
  where id = p_registration_id and status = 'scheduled';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or not schedulable');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 7) mark_mock_completed: set completed_at ==========
create or replace function public.mark_mock_completed(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  update public.mock_registrations
  set status = 'completed', completed_at = coalesce(completed_at, now())
  where id = p_registration_id and status = 'scheduled';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or already completed');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 8) get_admin_mock_registrations: include scheduled_at, meet_link, admin_notes, completed_at ==========
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

  select jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_email', a.email,
      'aspirant_name', a.full_name,
      'created_at', r.created_at,
      'status', r.status,
      'availability_notes', r.availability_notes,
      'scheduled_at', r.scheduled_at,
      'meet_link', r.meet_link,
      'admin_notes', r.admin_notes,
      'completed_at', r.completed_at
    ) order by r.created_at desc
  ) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id;

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

-- ========== 9) Admin: completed mocks report (date-wise: who, timings, everything) ==========
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
      'status', r.status
    ) order by coalesce(r.completed_at, r.scheduled_at, r.created_at) desc
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  where r.status = 'completed'
    and (r.completed_at::date between v_from and v_to
         or (r.completed_at is null and r.scheduled_at is not null and r.scheduled_at::date between v_from and v_to)
         or (r.completed_at is null and r.scheduled_at is null and r.created_at::date between v_from and v_to));
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
