-- G6: Manual "premium started" lock for free members + class Free/Golden tier on create/edit.

create or replace function public.admin_set_course_recordings_locked(
  p_course_id uuid,
  p_locked boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.courses%rowtype;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;
  if p_locked is null then
    return jsonb_build_object('ok', false, 'error', 'locked required');
  end if;

  update public.courses
  set recordings_locked_for_free = p_locked
  where id = p_course_id
  returning * into v_course;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Course not found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'course_id', v_course.id,
    'recordings_locked_for_free', v_course.recordings_locked_for_free
  );
end;
$$;

-- Replace staff class create/update with access_tier (drop old signatures)
drop function if exists public.staff_create_course_class(uuid, text, timestamptz, text, text);
drop function if exists public.staff_update_course_class(uuid, text, timestamptz, text, text, boolean);

create or replace function public.staff_create_course_class(
  p_course_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_meet_url_1 text,
  p_meet_url_2 text default null,
  p_access_tier text default 'free'
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
  v_tier text := lower(trim(coalesce(p_access_tier, 'free')));
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
  if v_tier not in ('free', 'golden') then
    return jsonb_build_object('ok', false, 'error', 'access_tier must be free or golden');
  end if;

  insert into public.course_classes (
    course_id, title, starts_at, meet_url_1, meet_url_2, access_tier, created_by, updated_by
  ) values (
    p_course_id, v_title, p_starts_at, v_u1, v_u2, v_tier, auth.uid(), auth.uid()
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.staff_update_course_class(
  p_id uuid,
  p_title text default null,
  p_starts_at timestamptz default null,
  p_meet_url_1 text default null,
  p_meet_url_2 text default null,
  p_clear_meet_url_2 boolean default false,
  p_access_tier text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.course_classes%rowtype;
  v_tier text := nullif(lower(trim(coalesce(p_access_tier, ''))), '');
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

  if v_tier is not null and v_tier not in ('free', 'golden') then
    return jsonb_build_object('ok', false, 'error', 'access_tier must be free or golden');
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
    access_tier = coalesce(v_tier, access_tier),
    updated_by = auth.uid()
  where id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- Expose lock flag on aspirant course list (for messaging)
create or replace function public.list_active_courses()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
  r record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not exists (select 1 from public.aspirants where id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'Aspirant profile required');
  end if;

  for r in
    select id from public.course_members
    where aspirant_id = v_uid and status = 'golden' and access_state = 'active'
  loop
    perform public.sync_course_member_payment_access(r.id);
  end loop;

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
      c.recordings_locked_for_free,
      c.golden_terms_enabled,
      case
        when c.golden_terms_enabled then coalesce(c.golden_terms_bullets, '[]'::jsonb)
        else '[]'::jsonb
      end as golden_terms_bullets,
      m.id as membership_id,
      m.status as membership_status,
      m.reason as membership_reason,
      m.joined_at,
      m.reviewed_at,
      m.access_state,
      m.golden_request_reason,
      m.golden_requested_at,
      m.golden_reviewed_at,
      m.chosen_pack,
      m.installments_paid,
      m.installments_total,
      m.next_due_at,
      case
        when m.id is null then null
        else public.course_member_due_info(m)
      end as payment_due,
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

grant execute on function public.admin_set_course_recordings_locked(uuid, boolean) to authenticated;
grant execute on function public.staff_create_course_class(uuid, text, timestamptz, text, text, text) to authenticated;
grant execute on function public.staff_update_course_class(uuid, text, timestamptz, text, text, boolean, text) to authenticated;
grant execute on function public.list_active_courses() to authenticated;
