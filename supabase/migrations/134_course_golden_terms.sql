-- Per-course Golden request Terms & Conditions as admin bullet points.

alter table public.courses
  add column if not exists golden_terms_enabled boolean not null default false;

alter table public.courses
  add column if not exists golden_terms_bullets jsonb not null default '[]'::jsonb;

comment on column public.courses.golden_terms_enabled is
  'When true, aspirants must view and accept these terms when requesting Golden access.';
comment on column public.courses.golden_terms_bullets is
  'JSON array of plain-text bullet strings shown in the Golden request modal.';

-- Admin: save terms bullets for a course
create or replace function public.admin_upsert_course_golden_terms(
  p_course_id uuid,
  p_enabled boolean,
  p_bullets jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.courses%rowtype;
  v_bullets jsonb := '[]'::jsonb;
  v_item text;
  v_count int := 0;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;
  if p_enabled is null then
    return jsonb_build_object('ok', false, 'error', 'enabled required');
  end if;
  if p_bullets is not null and jsonb_typeof(p_bullets) is distinct from 'array' then
    return jsonb_build_object('ok', false, 'error', 'bullets must be a JSON array');
  end if;

  -- Normalize: trim, drop empties, cap length per bullet and count
  if p_bullets is not null then
    for v_item in
      select trim(both from x)
      from jsonb_array_elements_text(p_bullets) as t(x)
    loop
      if v_item is null or v_item = '' then
        continue;
      end if;
      if char_length(v_item) > 500 then
        return jsonb_build_object('ok', false, 'error', 'Each bullet must be 500 characters or less');
      end if;
      v_count := v_count + 1;
      if v_count > 40 then
        return jsonb_build_object('ok', false, 'error', 'Maximum 40 bullet points');
      end if;
      v_bullets := v_bullets || jsonb_build_array(v_item);
    end loop;
  end if;

  if p_enabled and v_count < 1 then
    return jsonb_build_object('ok', false, 'error', 'Add at least one bullet point when terms are shown');
  end if;

  update public.courses
  set
    golden_terms_enabled = p_enabled,
    golden_terms_bullets = case
      when p_enabled then v_bullets
      else coalesce(nullif(v_bullets, '[]'::jsonb), golden_terms_bullets)
    end,
    updated_at = now()
  where id = p_course_id
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Course not found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'course', jsonb_build_object(
      'id', v_row.id,
      'golden_terms_enabled', v_row.golden_terms_enabled,
      'golden_terms_bullets', v_row.golden_terms_bullets
    )
  );
end;
$$;

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

drop function if exists public.request_course_golden(uuid, text);
drop function if exists public.request_course_golden(uuid, text, boolean);

create or replace function public.request_course_golden(
  p_course_id uuid,
  p_reason text default null,
  p_accepted_terms boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.course_members%rowtype;
  v_course public.courses%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_bullet_count int;
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

  select coalesce(jsonb_array_length(v_course.golden_terms_bullets), 0) into v_bullet_count;

  if v_course.golden_terms_enabled
     and v_bullet_count > 0
     and coalesce(p_accepted_terms, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'You must accept the Terms & Conditions');
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    return jsonb_build_object('ok', false, 'error', 'Reason must be 500 characters or less');
  end if;

  select * into v_member
  from public.course_members
  where course_id = p_course_id and aspirant_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Join the course first');
  end if;

  if v_member.status = 'golden_requested' then
    return jsonb_build_object('ok', true, 'status', 'golden_requested', 'member_id', v_member.id);
  end if;

  if v_member.status = 'golden' then
    return jsonb_build_object('ok', false, 'error', 'Already on Golden access');
  end if;

  if v_member.status not in ('free', 'golden_rejected') then
    return jsonb_build_object('ok', false, 'error', 'Only free members can request Golden access');
  end if;

  update public.course_members
  set
    status = 'golden_requested',
    access_state = 'none',
    golden_request_reason = v_reason,
    golden_requested_at = now(),
    golden_reviewed_by = null,
    golden_reviewed_at = null,
    updated_at = now()
  where id = v_member.id
  returning * into v_member;

  return jsonb_build_object(
    'ok', true,
    'status', 'golden_requested',
    'member_id', v_member.id,
    'access_state', v_member.access_state
  );
end;
$$;

grant execute on function public.admin_upsert_course_golden_terms(uuid, boolean, jsonb) to authenticated;
grant execute on function public.request_course_golden(uuid, text, boolean) to authenticated;
grant execute on function public.list_active_courses() to authenticated;
