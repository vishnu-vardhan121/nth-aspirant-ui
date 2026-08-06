-- Class topics (early), optional recording/attendance, doubt requests/sessions, admin-only feedback.

-- ========== extend course_classes ==========
alter table public.course_classes
  add column if not exists recording_url text,
  add column if not exists covered_topics text[] not null default '{}',
  add column if not exists attendance_min_duration_minutes int,
  add column if not exists session_logged_at timestamptz,
  add column if not exists session_logged_by uuid references public.admins(id) on delete set null,
  add column if not exists topics_saved_at timestamptz;

comment on column public.course_classes.recording_url is 'Optional post-class recording URL.';
comment on column public.course_classes.covered_topics is 'Topics covered; save early (≥3 via RPC).';

-- ========== attendance ==========
create table if not exists public.course_class_attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.course_classes(id) on delete cascade,
  aspirant_id uuid references public.aspirants(id) on delete set null,
  email text not null,
  duration_minutes int,
  status text not null,
  uploaded_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint course_class_attendance_status_check
    check (status in ('attended', 'too_short', 'not_in_batch', 'absent')),
  constraint course_class_attendance_email_nonempty
    check (char_length(trim(email)) >= 3)
);

create index if not exists course_class_attendance_class_idx
  on public.course_class_attendance (class_id);

create unique index if not exists course_class_attendance_class_email_uidx
  on public.course_class_attendance (class_id, lower(trim(email)));

alter table public.course_class_attendance enable row level security;

drop policy if exists "course_class_attendance_staff_all" on public.course_class_attendance;
create policy "course_class_attendance_staff_all"
  on public.course_class_attendance for all to authenticated
  using (public.is_course_staff())
  with check (public.is_course_staff());

-- ========== class feedback (ops admin read via RPC) ==========
create table if not exists public.course_class_feedback (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.course_classes(id) on delete cascade,
  aspirant_id uuid not null references public.aspirants(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_class_feedback_body_len
    check (char_length(body) >= 1 and char_length(body) <= 500),
  constraint course_class_feedback_unique unique (class_id, aspirant_id)
);

create index if not exists course_class_feedback_class_idx
  on public.course_class_feedback (class_id);

alter table public.course_class_feedback enable row level security;

-- No direct table policies for staff/aspirant reads of others' feedback.
-- Writes via SECURITY DEFINER RPCs only.
drop policy if exists "course_class_feedback_no_direct" on public.course_class_feedback;
create policy "course_class_feedback_no_direct"
  on public.course_class_feedback for all to authenticated
  using (false)
  with check (false);

-- ========== doubt requests ==========
create table if not exists public.course_doubt_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.course_classes(id) on delete cascade,
  aspirant_id uuid not null references public.aspirants(id) on delete cascade,
  topics text[] not null,
  status text not null default 'pending',
  doubt_session_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_doubt_requests_topics_nonempty
    check (coalesce(array_length(topics, 1), 0) >= 1),
  constraint course_doubt_requests_status_check
    check (status in ('pending', 'notified')),
  constraint course_doubt_requests_unique unique (class_id, aspirant_id)
);

create index if not exists course_doubt_requests_class_idx
  on public.course_doubt_requests (class_id);

create index if not exists course_doubt_requests_status_idx
  on public.course_doubt_requests (status);

alter table public.course_doubt_requests enable row level security;

drop policy if exists "course_doubt_requests_staff_all" on public.course_doubt_requests;
create policy "course_doubt_requests_staff_all"
  on public.course_doubt_requests for all to authenticated
  using (public.is_course_staff())
  with check (public.is_course_staff());

drop policy if exists "course_doubt_requests_own_select" on public.course_doubt_requests;
create policy "course_doubt_requests_own_select"
  on public.course_doubt_requests for select to authenticated
  using (aspirant_id = auth.uid());

-- ========== doubt sessions (linked to a live class) ==========
create table if not exists public.course_doubt_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.course_classes(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  meet_url text not null,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint course_doubt_sessions_title_nonempty check (char_length(trim(title)) >= 1),
  constraint course_doubt_sessions_meet_url_nonempty check (char_length(trim(meet_url)) >= 8)
);

create index if not exists course_doubt_sessions_class_idx
  on public.course_doubt_sessions (class_id);

create index if not exists course_doubt_sessions_course_starts_idx
  on public.course_doubt_sessions (course_id, starts_at);

alter table public.course_doubt_sessions enable row level security;

drop policy if exists "course_doubt_sessions_staff_all" on public.course_doubt_sessions;
create policy "course_doubt_sessions_staff_all"
  on public.course_doubt_sessions for all to authenticated
  using (public.is_course_staff())
  with check (public.is_course_staff());

drop policy if exists "course_doubt_sessions_member_select" on public.course_doubt_sessions;
create policy "course_doubt_sessions_member_select"
  on public.course_doubt_sessions for select to authenticated
  using (
    exists (
      select 1 from public.course_doubt_requests r
      where r.doubt_session_id = course_doubt_sessions.id
        and r.aspirant_id = auth.uid()
    )
  );

alter table public.course_doubt_requests
  drop constraint if exists course_doubt_requests_session_fk;
alter table public.course_doubt_requests
  add constraint course_doubt_requests_session_fk
  foreign key (doubt_session_id) references public.course_doubt_sessions(id) on delete set null;

-- ========== staff: save topics (≥3) ==========
create or replace function public.staff_save_course_class_topics(
  p_class_id uuid,
  p_covered_topics text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topics text[];
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if not exists (select 1 from public.course_classes where id = p_class_id) then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;

  select coalesce(array_agg(trim(t) order by ordinality), '{}')
    into v_topics
  from unnest(coalesce(p_covered_topics, '{}')) with ordinality as u(t, ordinality)
  where char_length(trim(t)) >= 1;

  if coalesce(array_length(v_topics, 1), 0) < 3 then
    return jsonb_build_object('ok', false, 'error', 'Add at least 3 covered topics');
  end if;

  update public.course_classes set
    covered_topics = v_topics,
    topics_saved_at = now(),
    updated_by = auth.uid()
  where id = p_class_id;

  return jsonb_build_object('ok', true, 'covered_topics', to_jsonb(v_topics));
end;
$$;

-- ========== staff: save recording (optional anytime) ==========
create or replace function public.staff_save_course_class_recording(
  p_class_id uuid,
  p_recording_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := trim(coalesce(p_recording_url, ''));
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if not exists (select 1 from public.course_classes where id = p_class_id) then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;
  if char_length(v_url) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Recording link is required');
  end if;

  update public.course_classes set
    recording_url = v_url,
    updated_by = auth.uid()
  where id = p_class_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== staff: free members for attendance match ==========
create or replace function public.staff_list_course_class_free_members(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'Course is required');
  end if;

  return jsonb_build_object(
    'ok', true,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'aspirant_id', a.id,
        'email', lower(trim(a.email)),
        'full_name', a.full_name
      ) order by lower(trim(a.email)))
      from public.course_members m
      join public.aspirants a on a.id = m.aspirant_id
      where m.course_id = p_course_id
        and m.status = 'free'
        and coalesce(trim(a.email), '') <> ''
    ), '[]'::jsonb)
  );
end;
$$;

-- ========== staff: get session snapshot ==========
create or replace function public.staff_get_course_class_session(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cl public.course_classes%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  select * into v_cl from public.course_classes where id = p_class_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'class', jsonb_build_object(
      'id', v_cl.id,
      'course_id', v_cl.course_id,
      'title', v_cl.title,
      'starts_at', v_cl.starts_at,
      'recording_url', v_cl.recording_url,
      'covered_topics', coalesce(to_jsonb(v_cl.covered_topics), '[]'::jsonb),
      'attendance_min_duration_minutes', v_cl.attendance_min_duration_minutes,
      'session_logged_at', v_cl.session_logged_at,
      'topics_saved_at', v_cl.topics_saved_at
    ),
    'attendance', coalesce((
      select jsonb_agg(to_jsonb(att) order by att.status, att.email)
      from public.course_class_attendance att
      where att.class_id = p_class_id
    ), '[]'::jsonb),
    'pending_doubt_count', (
      select count(*)::int from public.course_doubt_requests r
      where r.class_id = p_class_id and r.status = 'pending'
    )
  );
end;
$$;

-- ========== staff: upload attendance (no recording required) ==========
create or replace function public.staff_upload_course_class_attendance(
  p_class_id uuid,
  p_min_duration_minutes int,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min int := coalesce(p_min_duration_minutes, 0);
  v_elem jsonb;
  v_email text;
  v_status text;
  v_dur int;
  v_asp uuid;
  v_count int := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if not exists (select 1 from public.course_classes where id = p_class_id) then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;
  if v_min < 1 then
    return jsonb_build_object('ok', false, 'error', 'Min duration must be at least 1 minute');
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Attendance rows are required');
  end if;

  update public.course_classes set
    attendance_min_duration_minutes = v_min,
    session_logged_at = now(),
    session_logged_by = auth.uid(),
    updated_by = auth.uid()
  where id = p_class_id;

  delete from public.course_class_attendance where class_id = p_class_id;

  for v_elem in select * from jsonb_array_elements(p_rows)
  loop
    v_email := lower(trim(coalesce(v_elem->>'email', '')));
    v_status := trim(coalesce(v_elem->>'status', ''));
    begin
      v_dur := nullif(v_elem->>'duration_minutes', '')::int;
    exception when others then
      v_dur := null;
    end;
    begin
      v_asp := nullif(v_elem->>'aspirant_id', '')::uuid;
    exception when others then
      v_asp := null;
    end;

    if v_email = '' then
      continue;
    end if;
    if v_status not in ('attended', 'too_short', 'not_in_batch', 'absent') then
      return jsonb_build_object('ok', false, 'error', 'Invalid attendance status');
    end if;

    insert into public.course_class_attendance (
      class_id, aspirant_id, email, duration_minutes, status, uploaded_by
    ) values (
      p_class_id, v_asp, v_email, v_dur, v_status, auth.uid()
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'saved_count', v_count);
end;
$$;

-- ========== aspirant: classes with topics for follow-up ==========
create or replace function public.list_my_course_class_followups(p_course_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  return jsonb_build_object(
    'ok', true,
    'classes', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.starts_at desc)
      from (
        select
          cl.id,
          cl.course_id,
          c.title as course_title,
          cl.title,
          cl.starts_at,
          cl.covered_topics,
          (select r.topics from public.course_doubt_requests r
            where r.class_id = cl.id and r.aspirant_id = auth.uid() limit 1) as my_request_topics,
          (select r.status from public.course_doubt_requests r
            where r.class_id = cl.id and r.aspirant_id = auth.uid() limit 1) as my_request_status,
          (select f.body from public.course_class_feedback f
            where f.class_id = cl.id and f.aspirant_id = auth.uid() limit 1) as my_feedback,
          (
            select jsonb_agg(jsonb_build_object(
              'id', ds.id,
              'title', ds.title,
              'starts_at', ds.starts_at,
              'meet_url', ds.meet_url
            ) order by ds.starts_at asc)
            from public.course_doubt_sessions ds
            join public.course_doubt_requests r2
              on r2.doubt_session_id = ds.id
             and r2.aspirant_id = auth.uid()
            where ds.class_id = cl.id
          ) as my_doubt_sessions
        from public.course_classes cl
        join public.courses c on c.id = cl.course_id
        join public.course_members m
          on m.course_id = cl.course_id
         and m.aspirant_id = auth.uid()
         and m.status = 'free'
        where coalesce(array_length(cl.covered_topics, 1), 0) >= 3
          and (p_course_id is null or cl.course_id = p_course_id)
        order by cl.starts_at desc
        limit 100
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ========== aspirant: doubt request (topic multi-select only) ==========
create or replace function public.submit_course_class_doubt_request(
  p_class_id uuid,
  p_topics text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cl public.course_classes%rowtype;
  v_topics text[];
  v_topic text;
  v_existing text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_cl from public.course_classes where id = p_class_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;

  if not exists (
    select 1 from public.course_members m
    where m.course_id = v_cl.course_id
      and m.aspirant_id = auth.uid()
      and m.status = 'free'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Not enrolled');
  end if;

  if coalesce(array_length(v_cl.covered_topics, 1), 0) < 3 then
    return jsonb_build_object('ok', false, 'error', 'Topics not available yet');
  end if;

  select coalesce(array_agg(distinct trim(t)), '{}')
    into v_topics
  from unnest(coalesce(p_topics, '{}')) as t
  where char_length(trim(t)) >= 1;

  if coalesce(array_length(v_topics, 1), 0) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Select at least one topic');
  end if;

  foreach v_topic in array v_topics
  loop
    if not (v_topic = any (v_cl.covered_topics)) then
      return jsonb_build_object('ok', false, 'error', 'Invalid topic selected');
    end if;
  end loop;

  select status into v_existing
  from public.course_doubt_requests
  where class_id = p_class_id and aspirant_id = auth.uid();

  if found and v_existing = 'notified' then
    return jsonb_build_object('ok', false, 'error', 'Doubt session already shared for this class');
  end if;

  insert into public.course_doubt_requests (class_id, aspirant_id, topics, status)
  values (p_class_id, auth.uid(), v_topics, 'pending')
  on conflict (class_id, aspirant_id) do update set
    topics = excluded.topics,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== aspirant: class feedback (500) ==========
create or replace function public.submit_course_class_feedback(
  p_class_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cl public.course_classes%rowtype;
  v_body text := trim(coalesce(p_body, ''));
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_cl from public.course_classes where id = p_class_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;

  if not exists (
    select 1 from public.course_members m
    where m.course_id = v_cl.course_id
      and m.aspirant_id = auth.uid()
      and m.status = 'free'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Not enrolled');
  end if;

  if char_length(v_body) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Feedback is required');
  end if;
  if char_length(v_body) > 500 then
    return jsonb_build_object('ok', false, 'error', 'Feedback must be 500 characters or less');
  end if;

  insert into public.course_class_feedback (class_id, aspirant_id, body)
  values (p_class_id, auth.uid(), v_body)
  on conflict (class_id, aspirant_id) do update set
    body = excluded.body,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== staff: create doubt session + message requesters ==========
create or replace function public.staff_create_course_doubt_session(
  p_class_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_meet_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cl public.course_classes%rowtype;
  v_title text := trim(coalesce(p_title, ''));
  v_url text := trim(coalesce(p_meet_url, ''));
  v_id uuid;
  v_req record;
  v_body text;
  v_subject text;
  v_notified int := 0;
  v_when text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  select * into v_cl from public.course_classes where id = p_class_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;
  if char_length(v_title) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Title is required');
  end if;
  if p_starts_at is null then
    return jsonb_build_object('ok', false, 'error', 'Start time is required');
  end if;
  if char_length(v_url) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Zoom link is required');
  end if;

  insert into public.course_doubt_sessions (
    class_id, course_id, title, starts_at, meet_url, created_by
  ) values (
    p_class_id, v_cl.course_id, v_title, p_starts_at, v_url, auth.uid()
  )
  returning id into v_id;

  v_when := to_char(timezone('Asia/Kolkata', p_starts_at), 'DD Mon YYYY, HH12:MI AM');
  v_subject := 'Doubt session: ' || v_title;
  v_body :=
    'A doubt session was scheduled for your class "' || v_cl.title || '".' || E'\n\n'
    || 'Session: ' || v_title || E'\n'
    || 'When (IST): ' || v_when || E'\n'
    || 'Join: ' || v_url;

  for v_req in
    select * from public.course_doubt_requests
    where class_id = p_class_id and status = 'pending'
  loop
    update public.course_doubt_requests set
      status = 'notified',
      doubt_session_id = v_id,
      updated_at = now()
    where id = v_req.id;

    insert into public.messages (from_admin_id, to_aspirant_id, body, subject)
    values (auth.uid(), v_req.aspirant_id, v_body, v_subject);

    v_notified := v_notified + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'notified_count', v_notified
  );
end;
$$;

-- ========== staff: list doubt sessions for a course ==========
create or replace function public.staff_list_course_doubt_sessions(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ds.id,
        'class_id', ds.class_id,
        'class_title', cl.title,
        'title', ds.title,
        'starts_at', ds.starts_at,
        'meet_url', ds.meet_url,
        'created_at', ds.created_at,
        'request_count', (
          select count(*)::int from public.course_doubt_requests r
          where r.doubt_session_id = ds.id
        )
      ) order by ds.starts_at desc)
      from public.course_doubt_sessions ds
      join public.course_classes cl on cl.id = ds.class_id
      where ds.course_id = p_course_id
    ), '[]'::jsonb)
  );
end;
$$;

-- ========== staff: list pending requests for a class ==========
create or replace function public.staff_list_course_doubt_requests(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'aspirant_id', r.aspirant_id,
        'full_name', a.full_name,
        'email', a.email,
        'topics', to_jsonb(r.topics),
        'status', r.status,
        'doubt_session_id', r.doubt_session_id,
        'created_at', r.created_at
      ) order by r.created_at asc)
      from public.course_doubt_requests r
      join public.aspirants a on a.id = r.aspirant_id
      where r.class_id = p_class_id
    ), '[]'::jsonb)
  );
end;
$$;

-- ========== ops admin only: class feedback list ==========
create or replace function public.admin_list_course_class_feedback(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'class_id', f.class_id,
        'class_title', cl.title,
        'starts_at', cl.starts_at,
        'aspirant_id', f.aspirant_id,
        'full_name', a.full_name,
        'email', a.email,
        'body', f.body,
        'created_at', f.created_at
      ) order by f.created_at desc)
      from public.course_class_feedback f
      join public.course_classes cl on cl.id = f.class_id
      join public.aspirants a on a.id = f.aspirant_id
      where cl.course_id = p_course_id
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.staff_save_course_class_topics(uuid, text[]) to authenticated;
grant execute on function public.staff_save_course_class_recording(uuid, text) to authenticated;
grant execute on function public.staff_list_course_class_free_members(uuid) to authenticated;
grant execute on function public.staff_get_course_class_session(uuid) to authenticated;
grant execute on function public.staff_upload_course_class_attendance(uuid, int, jsonb) to authenticated;
grant execute on function public.list_my_course_class_followups(uuid) to authenticated;
grant execute on function public.submit_course_class_doubt_request(uuid, text[]) to authenticated;
grant execute on function public.submit_course_class_feedback(uuid, text) to authenticated;
grant execute on function public.staff_create_course_doubt_session(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.staff_list_course_doubt_sessions(uuid) to authenticated;
grant execute on function public.staff_list_course_doubt_requests(uuid) to authenticated;
grant execute on function public.admin_list_course_class_feedback(uuid) to authenticated;
