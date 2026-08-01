-- AI/ML course free join (phase 1): courses, invites, members + RPCs.
-- Ops admins (not interviewers) manage join reviews.

-- ========== helpers ==========
create or replace function public.is_ops_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where id = auth.uid()
      and role in ('super admin', 'admin', 'assistant admin')
  );
$$;

comment on function public.is_ops_admin() is
  'True for super admin / admin / assistant admin. Excludes interviewers.';

-- ========== tables ==========
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  free_starts_at timestamptz,
  free_ends_at timestamptz,
  premium_starts_at timestamptz,
  premium_ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_code_nonempty check (char_length(trim(code)) >= 1),
  constraint courses_title_nonempty check (char_length(trim(title)) >= 1)
);

create unique index if not exists courses_code_unique_idx
  on public.courses (lower(trim(code)));

create index if not exists courses_is_active_idx
  on public.courses (is_active);

create table if not exists public.course_invites (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  email text not null,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint course_invites_email_nonempty check (char_length(trim(email)) >= 3),
  constraint course_invites_course_email_unique unique (course_id, email)
);

create index if not exists course_invites_course_id_idx
  on public.course_invites (course_id);

create table if not exists public.course_members (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  aspirant_id uuid not null references public.aspirants(id) on delete cascade,
  status text not null,
  reason text,
  reviewed_by uuid references public.admins(id) on delete set null,
  reviewed_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_members_status_check
    check (status in ('requested', 'free', 'rejected')),
  constraint course_members_course_aspirant_unique unique (course_id, aspirant_id)
);

create index if not exists course_members_course_status_idx
  on public.course_members (course_id, status);

create index if not exists course_members_aspirant_id_idx
  on public.course_members (aspirant_id);

-- ========== RLS ==========
alter table public.courses enable row level security;
alter table public.course_invites enable row level security;
alter table public.course_members enable row level security;

drop policy if exists "courses_select_active_or_ops" on public.courses;
create policy "courses_select_active_or_ops"
  on public.courses for select to authenticated
  using (is_active = true or public.is_ops_admin());

drop policy if exists "courses_ops_all" on public.courses;
create policy "courses_ops_all"
  on public.courses for all to authenticated
  using (public.is_ops_admin())
  with check (public.is_ops_admin());

drop policy if exists "course_invites_ops_all" on public.course_invites;
create policy "course_invites_ops_all"
  on public.course_invites for all to authenticated
  using (public.is_ops_admin())
  with check (public.is_ops_admin());

drop policy if exists "course_members_select_own_or_ops" on public.course_members;
create policy "course_members_select_own_or_ops"
  on public.course_members for select to authenticated
  using (aspirant_id = auth.uid() or public.is_ops_admin());

drop policy if exists "course_members_ops_all" on public.course_members;
create policy "course_members_ops_all"
  on public.course_members for all to authenticated
  using (public.is_ops_admin())
  with check (public.is_ops_admin());

-- ========== aspirant email helper ==========
create or replace function public.current_aspirant_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(coalesce(
    (select a.email from public.aspirants a where a.id = auth.uid()),
    auth.jwt() ->> 'email',
    ''
  )));
$$;

-- ========== aspirant RPCs ==========
create or replace function public.list_active_courses()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not exists (select 1 from public.aspirants where id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'Aspirant profile required');
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      c.id,
      c.code,
      c.title,
      c.free_starts_at,
      c.free_ends_at,
      c.is_active,
      c.created_at,
      m.id as membership_id,
      m.status as membership_status,
      m.reason as membership_reason,
      m.joined_at,
      m.reviewed_at,
      exists (
        select 1
        from public.course_invites ci
        where ci.course_id = c.id
          and lower(trim(ci.email)) = public.current_aspirant_email()
      ) as is_invited
    from public.courses c
    left join public.course_members m
      on m.course_id = c.id and m.aspirant_id = v_uid
    where c.is_active = true
    order by c.created_at desc
  ) t;

  return jsonb_build_object('ok', true, 'courses', v_rows);
end;
$$;

create or replace function public.join_course_free(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_course public.courses%rowtype;
  v_member public.course_members%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not exists (select 1 from public.aspirants where id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'Aspirant profile required');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if not found or v_course.is_active is not true then
    return jsonb_build_object('ok', false, 'error', 'Course not available');
  end if;

  v_email := public.current_aspirant_email();
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'Email required to join');
  end if;

  if not exists (
    select 1 from public.course_invites ci
    where ci.course_id = p_course_id
      and lower(trim(ci.email)) = v_email
  ) then
    return jsonb_build_object('ok', false, 'error', 'You are not invited. Please request to join.');
  end if;

  select * into v_member
  from public.course_members
  where course_id = p_course_id and aspirant_id = v_uid;

  if found and v_member.status = 'free' then
    return jsonb_build_object('ok', true, 'status', 'free', 'member_id', v_member.id);
  end if;

  if found then
    update public.course_members
    set
      status = 'free',
      joined_at = coalesce(joined_at, now()),
      reviewed_by = null,
      reviewed_at = null,
      updated_at = now()
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.course_members (course_id, aspirant_id, status, joined_at)
    values (p_course_id, v_uid, 'free', now())
    returning * into v_member;
  end if;

  return jsonb_build_object('ok', true, 'status', 'free', 'member_id', v_member.id);
end;
$$;

create or replace function public.request_course_join(p_course_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := trim(coalesce(p_reason, ''));
  v_course public.courses%rowtype;
  v_member public.course_members%rowtype;
  v_email text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not exists (select 1 from public.aspirants where id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'Aspirant profile required');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;
  if char_length(v_reason) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Please write a short reason (at least 10 characters)');
  end if;
  if char_length(v_reason) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'Reason is too long');
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if not found or v_course.is_active is not true then
    return jsonb_build_object('ok', false, 'error', 'Course not available');
  end if;

  v_email := public.current_aspirant_email();
  if v_email <> '' and exists (
    select 1 from public.course_invites ci
    where ci.course_id = p_course_id
      and lower(trim(ci.email)) = v_email
  ) then
    return jsonb_build_object('ok', false, 'error', 'You are invited — use Join instead of request');
  end if;

  select * into v_member
  from public.course_members
  where course_id = p_course_id and aspirant_id = v_uid;

  if found and v_member.status = 'free' then
    return jsonb_build_object('ok', false, 'error', 'You already joined this course');
  end if;

  if found and v_member.status = 'requested' then
    update public.course_members
    set reason = v_reason, updated_at = now()
    where id = v_member.id
    returning * into v_member;
    return jsonb_build_object('ok', true, 'status', 'requested', 'member_id', v_member.id);
  end if;

  if found then
    -- rejected → allow re-request
    update public.course_members
    set
      status = 'requested',
      reason = v_reason,
      reviewed_by = null,
      reviewed_at = null,
      joined_at = null,
      updated_at = now()
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.course_members (course_id, aspirant_id, status, reason)
    values (p_course_id, v_uid, 'requested', v_reason)
    returning * into v_member;
  end if;

  return jsonb_build_object('ok', true, 'status', 'requested', 'member_id', v_member.id);
end;
$$;

-- ========== admin RPCs ==========
create or replace function public.admin_list_courses()
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

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      c.*,
      (select count(*)::int from public.course_invites ci where ci.course_id = c.id) as invite_count,
      (select count(*)::int from public.course_members cm where cm.course_id = c.id and cm.status = 'requested') as requested_count,
      (select count(*)::int from public.course_members cm where cm.course_id = c.id and cm.status = 'free') as free_member_count
    from public.courses c
    order by c.created_at desc
  ) t;

  return jsonb_build_object('ok', true, 'courses', v_rows);
end;
$$;

create or replace function public.admin_create_course(
  p_code text,
  p_title text,
  p_free_starts_at timestamptz default null,
  p_free_ends_at timestamptz default null,
  p_premium_starts_at timestamptz default null,
  p_premium_ends_at timestamptz default null,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := lower(trim(coalesce(p_code, '')));
  v_title text := trim(coalesce(p_title, ''));
  v_row public.courses%rowtype;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if v_code = '' then
    return jsonb_build_object('ok', false, 'error', 'code required');
  end if;
  if v_title = '' then
    return jsonb_build_object('ok', false, 'error', 'title required');
  end if;

  insert into public.courses (
    code, title, free_starts_at, free_ends_at,
    premium_starts_at, premium_ends_at, is_active, created_by
  )
  values (
    v_code, v_title, p_free_starts_at, p_free_ends_at,
    p_premium_starts_at, p_premium_ends_at, coalesce(p_is_active, true), auth.uid()
  )
  returning * into v_row;

  return jsonb_build_object('ok', true, 'course', to_jsonb(v_row));
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Course code already exists');
end;
$$;

create or replace function public.admin_update_course(
  p_course_id uuid,
  p_title text default null,
  p_free_starts_at timestamptz default null,
  p_free_ends_at timestamptz default null,
  p_premium_starts_at timestamptz default null,
  p_premium_ends_at timestamptz default null,
  p_is_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.courses%rowtype;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  update public.courses
  set
    title = coalesce(nullif(trim(p_title), ''), title),
    free_starts_at = case when p_free_starts_at is null then free_starts_at else p_free_starts_at end,
    free_ends_at = case when p_free_ends_at is null then free_ends_at else p_free_ends_at end,
    premium_starts_at = case when p_premium_starts_at is null then premium_starts_at else p_premium_starts_at end,
    premium_ends_at = case when p_premium_ends_at is null then premium_ends_at else p_premium_ends_at end,
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_course_id
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Course not found');
  end if;

  return jsonb_build_object('ok', true, 'course', to_jsonb(v_row));
end;
$$;

create or replace function public.admin_get_course(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_course jsonb;
  v_invites jsonb;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  select to_jsonb(c) into v_course
  from public.courses c
  where c.id = p_course_id;

  if v_course is null then
    return jsonb_build_object('ok', false, 'error', 'Course not found');
  end if;

  select coalesce(jsonb_agg(to_jsonb(ci) order by ci.created_at desc), '[]'::jsonb)
  into v_invites
  from public.course_invites ci
  where ci.course_id = p_course_id;

  return jsonb_build_object('ok', true, 'course', v_course, 'invites', v_invites);
end;
$$;

create or replace function public.admin_add_course_invites(p_course_id uuid, p_emails text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_norm text;
  v_added int := 0;
  v_skipped int := 0;
  v_dup int := 0;
  v_rowcount int;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;
  if not exists (select 1 from public.courses where id = p_course_id) then
    return jsonb_build_object('ok', false, 'error', 'Course not found');
  end if;
  if p_emails is null or cardinality(p_emails) = 0 then
    return jsonb_build_object('ok', false, 'error', 'emails required');
  end if;

  foreach v_email in array p_emails
  loop
    v_norm := lower(trim(coalesce(v_email, '')));
    if v_norm = '' or position('@' in v_norm) = 0 then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    insert into public.course_invites (course_id, email, created_by)
    values (p_course_id, v_norm, auth.uid())
    on conflict on constraint course_invites_course_email_unique do nothing;
    get diagnostics v_rowcount = row_count;
    if v_rowcount > 0 then
      v_added := v_added + 1;
    else
      v_dup := v_dup + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'added', v_added,
    'duplicates', v_dup,
    'skipped_invalid', v_skipped,
    'invite_count', (select count(*)::int from public.course_invites where course_id = p_course_id)
  );
end;
$$;

create or replace function public.admin_list_course_join_requests(p_course_id uuid default null)
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

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at asc), '[]'::jsonb)
  into v_rows
  from (
    select
      cm.id,
      cm.course_id,
      cm.aspirant_id,
      cm.status,
      cm.reason,
      cm.created_at,
      cm.updated_at,
      c.code as course_code,
      c.title as course_title,
      a.full_name as aspirant_name,
      a.email as aspirant_email,
      a.phone as aspirant_phone,
      a.track as aspirant_track,
      a.plan as aspirant_plan
    from public.course_members cm
    join public.courses c on c.id = cm.course_id
    join public.aspirants a on a.id = cm.aspirant_id
    where cm.status = 'requested'
      and (p_course_id is null or cm.course_id = p_course_id)
    order by cm.created_at asc
    limit 500
  ) t;

  return jsonb_build_object('ok', true, 'requests', v_rows);
end;
$$;

create or replace function public.admin_list_course_members(
  p_course_id uuid,
  p_status text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
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
      cm.course_id,
      cm.aspirant_id,
      cm.status,
      cm.reason,
      cm.joined_at,
      cm.reviewed_at,
      cm.created_at,
      a.full_name as aspirant_name,
      a.email as aspirant_email,
      a.phone as aspirant_phone
    from public.course_members cm
    join public.aspirants a on a.id = cm.aspirant_id
    where cm.course_id = p_course_id
      and (v_status is null or cm.status = v_status)
    order by cm.created_at desc
    limit 500
  ) t;

  return jsonb_build_object('ok', true, 'members', v_rows);
end;
$$;

create or replace function public.admin_review_course_join(p_member_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.course_members%rowtype;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_member_id is null then
    return jsonb_build_object('ok', false, 'error', 'member_id required');
  end if;
  if p_approve is null then
    return jsonb_build_object('ok', false, 'error', 'approve required');
  end if;

  select * into v_member
  from public.course_members
  where id = p_member_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found');
  end if;
  if v_member.status <> 'requested' then
    return jsonb_build_object('ok', false, 'error', 'Only pending requests can be reviewed');
  end if;

  if p_approve then
    update public.course_members
    set
      status = 'free',
      joined_at = now(),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    where id = p_member_id
    returning * into v_member;
  else
    update public.course_members
    set
      status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    where id = p_member_id
    returning * into v_member;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', v_member.status,
    'member_id', v_member.id
  );
end;
$$;

grant execute on function public.is_ops_admin() to authenticated;
grant execute on function public.current_aspirant_email() to authenticated;
grant execute on function public.list_active_courses() to authenticated;
grant execute on function public.join_course_free(uuid) to authenticated;
grant execute on function public.request_course_join(uuid, text) to authenticated;
grant execute on function public.admin_list_courses() to authenticated;
grant execute on function public.admin_create_course(text, text, timestamptz, timestamptz, timestamptz, timestamptz, boolean) to authenticated;
grant execute on function public.admin_update_course(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz, boolean) to authenticated;
grant execute on function public.admin_get_course(uuid) to authenticated;
grant execute on function public.admin_add_course_invites(uuid, text[]) to authenticated;
grant execute on function public.admin_list_course_join_requests(uuid) to authenticated;
grant execute on function public.admin_list_course_members(uuid, text) to authenticated;
grant execute on function public.admin_review_course_join(uuid, boolean) to authenticated;
