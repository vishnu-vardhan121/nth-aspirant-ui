-- Live course classes (Zoom/Meet links) for enrolled aspirants.
-- Times stored as timestamptz; UI treats Asia/Kolkata (IST).
-- Staff: any admin row (ops + interviewers) may manage all courses' classes.

create or replace function public.is_course_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;

comment on function public.is_course_staff() is
  'Admin or interviewer (any row in admins) may manage course live classes.';

create table if not exists public.course_classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  meet_url_1 text not null,
  meet_url_2 text,
  created_by uuid references public.admins(id) on delete set null,
  updated_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_classes_title_nonempty check (char_length(trim(title)) >= 1),
  constraint course_classes_meet_url_1_nonempty check (char_length(trim(meet_url_1)) >= 8)
);

create index if not exists course_classes_course_starts_idx
  on public.course_classes (course_id, starts_at);

create index if not exists course_classes_starts_at_idx
  on public.course_classes (starts_at);

drop trigger if exists course_classes_updated_at on public.course_classes;
create trigger course_classes_updated_at
  before update on public.course_classes
  for each row execute function public.set_updated_at();

alter table public.course_classes enable row level security;

-- Staff full access
drop policy if exists "course_classes_staff_all" on public.course_classes;
create policy "course_classes_staff_all"
  on public.course_classes for all to authenticated
  using (public.is_course_staff())
  with check (public.is_course_staff());

-- Enrolled aspirants can read classes for their free membership courses
drop policy if exists "course_classes_member_select" on public.course_classes;
create policy "course_classes_member_select"
  on public.course_classes for select to authenticated
  using (
    exists (
      select 1
      from public.course_members m
      where m.course_id = course_classes.course_id
        and m.aspirant_id = auth.uid()
        and m.status = 'free'
    )
  );

-- ========== staff list courses (active + inactive for schedule mgmt) ==========
create or replace function public.staff_list_courses_for_classes()
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
    'courses', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.is_active desc, c.created_at desc)
      from public.courses c
    ), '[]'::jsonb)
  );
end;
$$;

-- ========== staff list classes ==========
create or replace function public.staff_list_course_classes(p_course_id uuid)
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
    'classes', coalesce((
      select jsonb_agg(to_jsonb(cl) order by cl.starts_at asc)
      from public.course_classes cl
      where cl.course_id = p_course_id
    ), '[]'::jsonb)
  );
end;
$$;

-- ========== staff create ==========
create or replace function public.staff_create_course_class(
  p_course_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_meet_url_1 text,
  p_meet_url_2 text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_u1 text := trim(coalesce(p_meet_url_1, ''));
  v_u2 text := nullif(trim(coalesce(p_meet_url_2, '')), '');
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if p_course_id is null or not exists (select 1 from public.courses where id = p_course_id) then
    return jsonb_build_object('ok', false, 'error', 'Course not found');
  end if;
  if char_length(v_title) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Title is required');
  end if;
  if p_starts_at is null then
    return jsonb_build_object('ok', false, 'error', 'Start time is required');
  end if;
  if char_length(v_u1) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Join link is required');
  end if;

  insert into public.course_classes (
    course_id, title, starts_at, meet_url_1, meet_url_2, created_by, updated_by
  ) values (
    p_course_id, v_title, p_starts_at, v_u1, v_u2, auth.uid(), auth.uid()
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ========== staff update ==========
create or replace function public.staff_update_course_class(
  p_id uuid,
  p_title text default null,
  p_starts_at timestamptz default null,
  p_meet_url_1 text default null,
  p_meet_url_2 text default null,
  p_clear_meet_url_2 boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.course_classes%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  select * into v_row from public.course_classes where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;

  update public.course_classes set
    title = coalesce(nullif(trim(p_title), ''), title),
    starts_at = coalesce(p_starts_at, starts_at),
    meet_url_1 = coalesce(nullif(trim(p_meet_url_1), ''), meet_url_1),
    meet_url_2 = case
      when p_clear_meet_url_2 then null
      when p_meet_url_2 is not null then nullif(trim(p_meet_url_2), '')
      else meet_url_2
    end,
    updated_by = auth.uid()
  where id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== staff delete ==========
create or replace function public.staff_delete_course_class(p_id uuid)
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

  delete from public.course_classes where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ========== aspirant: today + upcoming for free memberships ==========
create or replace function public.list_my_upcoming_course_classes()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_start timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  -- Start of "today" in IST
  v_today_start := date_trunc('day', timezone('Asia/Kolkata', now())) at time zone 'Asia/Kolkata';

  return jsonb_build_object(
    'ok', true,
    'classes', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.starts_at asc)
      from (
        select
          cl.id,
          cl.course_id,
          c.title as course_title,
          cl.title,
          cl.starts_at,
          cl.meet_url_1,
          cl.meet_url_2
        from public.course_classes cl
        join public.courses c on c.id = cl.course_id
        join public.course_members m
          on m.course_id = cl.course_id
         and m.aspirant_id = auth.uid()
         and m.status = 'free'
        where cl.starts_at >= v_today_start
        order by cl.starts_at asc
        limit 50
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.is_course_staff() to authenticated;
grant execute on function public.staff_list_courses_for_classes() to authenticated;
grant execute on function public.staff_list_course_classes(uuid) to authenticated;
grant execute on function public.staff_create_course_class(uuid, text, timestamptz, text, text) to authenticated;
grant execute on function public.staff_update_course_class(uuid, text, timestamptz, text, text, boolean) to authenticated;
grant execute on function public.staff_delete_course_class(uuid) to authenticated;
grant execute on function public.list_my_upcoming_course_classes() to authenticated;
