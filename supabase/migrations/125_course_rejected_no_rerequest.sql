-- Rejected course members cannot re-request; aspirant UI shows pending/seat message only.

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

  if found and v_member.status = 'rejected' then
    return jsonb_build_object(
      'ok', false,
      'error', 'Your seat request is pending. We will update you when a slot is available.'
    );
  end if;

  if found and v_member.status = 'requested' then
    update public.course_members
    set reason = v_reason, updated_at = now()
    where id = v_member.id
    returning * into v_member;
    return jsonb_build_object('ok', true, 'status', 'requested', 'member_id', v_member.id);
  end if;

  if found then
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

  select * into v_member
  from public.course_members
  where course_id = p_course_id and aspirant_id = v_uid;

  if found and v_member.status = 'rejected' then
    return jsonb_build_object(
      'ok', false,
      'error', 'Your seat request is pending. We will update you when a slot is available.'
    );
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
