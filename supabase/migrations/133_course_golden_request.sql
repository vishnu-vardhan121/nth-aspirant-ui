-- G1: Golden Batch request + staff (ops admin or interviewer) approve/reject.
-- Payment packs deferred to later phases.

-- ========== schema ==========
alter table public.course_members drop constraint if exists course_members_status_check;
alter table public.course_members
  add constraint course_members_status_check
  check (status in (
    'requested',
    'free',
    'rejected',
    'golden_requested',
    'golden',
    'golden_rejected'
  ));

alter table public.course_members
  add column if not exists access_state text not null default 'none';

alter table public.course_members
  add column if not exists golden_requested_at timestamptz;

alter table public.course_members
  add column if not exists golden_request_reason text;

alter table public.course_members
  add column if not exists golden_reviewed_by uuid references public.admins(id) on delete set null;

alter table public.course_members
  add column if not exists golden_reviewed_at timestamptz;

alter table public.course_members
  add column if not exists chosen_pack text;

alter table public.course_members
  add column if not exists next_due_at timestamptz;

alter table public.course_members
  add column if not exists installments_paid int not null default 0;

alter table public.course_members
  add column if not exists installments_total int;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'course_members_access_state_check'
  ) then
    alter table public.course_members
      add constraint course_members_access_state_check
      check (access_state in ('none', 'awaiting_payment', 'active', 'paused', 'completed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'course_members_chosen_pack_check'
  ) then
    alter table public.course_members
      add constraint course_members_chosen_pack_check
      check (chosen_pack is null or chosen_pack in ('full', 'two', 'three'));
  end if;
end $$;

comment on column public.course_members.access_state is
  'Golden payment gate: none | awaiting_payment | active | paused | completed';

-- Backfill
update public.course_members
set access_state = 'none'
where status in ('requested', 'free', 'rejected', 'golden_requested', 'golden_rejected')
  and (access_state is null or access_state = 'none');

update public.course_members
set access_state = 'active'
where status = 'golden'
  and access_state = 'none';

-- Free-tier content: free + mid-golden-request states + golden (paused still sees board cards)
create or replace function public.is_course_content_member_status(p_status text)
returns boolean
language sql
immutable
as $$
  select p_status in ('free', 'golden_requested', 'golden_rejected', 'golden');
$$;

-- RLS: enrolled members (broader than free-only)
drop policy if exists "course_classes_member_select" on public.course_classes;
create policy "course_classes_member_select"
  on public.course_classes for select to authenticated
  using (
    exists (
      select 1
      from public.course_members m
      where m.course_id = course_classes.course_id
        and m.aspirant_id = auth.uid()
        and public.is_course_content_member_status(m.status)
    )
  );

drop policy if exists "course_doubt_sessions_member_select" on public.course_doubt_sessions;
create policy "course_doubt_sessions_member_select"
  on public.course_doubt_sessions for select to authenticated
  using (
    exists (
      select 1
      from public.course_members m
      where m.course_id = course_doubt_sessions.course_id
        and m.aspirant_id = auth.uid()
        and public.is_course_content_member_status(m.status)
    )
  );

-- ========== list_active_courses: expose golden fields ==========
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

-- ========== board + watch: allow golden_* statuses ==========
create or replace function public.list_my_course_classes_board(p_course_id uuid default null)
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

  v_today_start := date_trunc('day', timezone('Asia/Kolkata', now())) at time zone 'Asia/Kolkata';

  return jsonb_build_object(
    'ok', true,
    'upcoming', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.starts_at asc)
      from (
        select
          cl.id,
          cl.course_id,
          c.title as course_title,
          cl.title,
          cl.starts_at,
          cl.meet_url_1,
          cl.meet_url_2,
          cl.covered_topics,
          (
            char_length(trim(coalesce(cl.recording_url, ''))) >= 8
            and not (
              c.recordings_locked_for_free
              and m.status in ('free', 'golden_requested', 'golden_rejected')
            )
            and not (
              m.status = 'golden' and m.access_state = 'paused'
            )
          ) as has_recording,
          (
            select jsonb_agg(jsonb_build_object(
              'id', ds.id,
              'title', ds.title,
              'starts_at', ds.starts_at,
              'meet_url', ds.meet_url
            ) order by ds.starts_at asc)
            from public.course_doubt_sessions ds
            where ds.class_id = cl.id
          ) as class_doubt_sessions
        from public.course_classes cl
        join public.courses c on c.id = cl.course_id
        join public.course_members m
          on m.course_id = cl.course_id
         and m.aspirant_id = auth.uid()
         and public.is_course_content_member_status(m.status)
        where cl.starts_at >= v_today_start
          and (p_course_id is null or cl.course_id = p_course_id)
          and (
            cl.access_tier = 'free'
            or m.status = 'golden'
          )
        order by cl.starts_at asc
        limit 50
      ) x
    ), '[]'::jsonb),
    'completed', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.starts_at desc)
      from (
        select
          cl.id,
          cl.course_id,
          c.title as course_title,
          cl.title,
          cl.starts_at,
          cl.covered_topics,
          (
            char_length(trim(coalesce(cl.recording_url, ''))) >= 8
            and not (
              c.recordings_locked_for_free
              and m.status in ('free', 'golden_requested', 'golden_rejected')
            )
            and not (
              m.status = 'golden' and m.access_state = 'paused'
            )
          ) as has_recording,
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
            where ds.class_id = cl.id
          ) as class_doubt_sessions
        from public.course_classes cl
        join public.courses c on c.id = cl.course_id
        join public.course_members m
          on m.course_id = cl.course_id
         and m.aspirant_id = auth.uid()
         and public.is_course_content_member_status(m.status)
        where cl.starts_at < v_today_start
          and (p_course_id is null or cl.course_id = p_course_id)
          and (
            cl.access_tier = 'free'
            or m.status = 'golden'
          )
        order by cl.starts_at desc
        limit 100
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_my_course_class_watch(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cl public.course_classes%rowtype;
  v_course public.courses%rowtype;
  v_member public.course_members%rowtype;
  v_play text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'class_id required');
  end if;

  select * into v_cl from public.course_classes where id = p_class_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;

  select * into v_course from public.courses where id = v_cl.course_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Course not found');
  end if;

  select * into v_member
  from public.course_members
  where course_id = v_cl.course_id
    and aspirant_id = auth.uid()
    and public.is_course_content_member_status(status);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Not enrolled');
  end if;

  if v_cl.access_tier = 'golden' and v_member.status is distinct from 'golden' then
    return jsonb_build_object('ok', false, 'error', 'This class is for Golden Batch only');
  end if;

  if v_member.status = 'golden' and v_member.access_state = 'paused' then
    return jsonb_build_object('ok', false, 'error', 'Access paused — pay the due installment to continue');
  end if;

  if char_length(trim(coalesce(v_cl.recording_url, ''))) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Recording not available yet');
  end if;

  if v_course.recordings_locked_for_free
     and v_member.status in ('free', 'golden_requested', 'golden_rejected') then
    return jsonb_build_object('ok', false, 'error', 'Recording is available for Golden Batch only');
  end if;

  -- Awaiting first payment: no golden unlock yet; still allow free-tier recordings unless locked
  if v_member.status = 'golden'
     and v_member.access_state = 'awaiting_payment'
     and v_cl.access_tier = 'golden' then
    return jsonb_build_object('ok', false, 'error', 'Complete payment to unlock Golden classes');
  end if;

  v_play := public.course_recording_preview_url(v_cl.recording_url);
  if v_play is null or char_length(v_play) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Invalid recording link');
  end if;

  return jsonb_build_object(
    'ok', true,
    'class', jsonb_build_object(
      'id', v_cl.id,
      'course_id', v_cl.course_id,
      'course_title', v_course.title,
      'title', v_cl.title,
      'starts_at', v_cl.starts_at,
      'covered_topics', coalesce(to_jsonb(v_cl.covered_topics), '[]'::jsonb),
      'playback_url', v_play
    )
  );
end;
$$;

-- ========== G1 RPCs ==========
create or replace function public.request_course_golden(p_course_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.course_members%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
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
  if not exists (select 1 from public.courses where id = p_course_id and is_active = true) then
    return jsonb_build_object('ok', false, 'error', 'Course not available');
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

create or replace function public.staff_list_course_golden_requests(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.golden_requested_at asc nulls last), '[]'::jsonb)
  into v_rows
  from (
    select
      cm.id,
      cm.course_id,
      cm.aspirant_id,
      cm.status,
      cm.access_state,
      cm.golden_request_reason,
      cm.golden_requested_at,
      cm.created_at,
      a.full_name as aspirant_name,
      a.email as aspirant_email,
      a.phone as aspirant_phone,
      a.track as aspirant_track,
      a.plan as aspirant_plan
    from public.course_members cm
    join public.aspirants a on a.id = cm.aspirant_id
    where cm.course_id = p_course_id
      and cm.status = 'golden_requested'
    order by cm.golden_requested_at asc nulls last
    limit 500
  ) t;

  return jsonb_build_object('ok', true, 'requests', v_rows);
end;
$$;

create or replace function public.staff_review_course_golden(p_member_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.course_members%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if p_member_id is null then
    return jsonb_build_object('ok', false, 'error', 'member_id required');
  end if;
  if p_approve is null then
    return jsonb_build_object('ok', false, 'error', 'approve required');
  end if;

  select * into v_member from public.course_members where id = p_member_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found');
  end if;
  if v_member.status is distinct from 'golden_requested' then
    return jsonb_build_object('ok', false, 'error', 'Not a pending Golden request');
  end if;

  if p_approve then
    update public.course_members
    set
      status = 'golden',
      access_state = 'awaiting_payment',
      golden_reviewed_by = auth.uid(),
      golden_reviewed_at = now(),
      updated_at = now()
    where id = p_member_id
    returning * into v_member;
  else
    update public.course_members
    set
      status = 'golden_rejected',
      access_state = 'none',
      golden_reviewed_by = auth.uid(),
      golden_reviewed_at = now(),
      updated_at = now()
    where id = p_member_id
    returning * into v_member;
  end if;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member.id,
    'status', v_member.status,
    'access_state', v_member.access_state
  );
end;
$$;

grant execute on function public.is_course_content_member_status(text) to authenticated;
grant execute on function public.request_course_golden(uuid, text) to authenticated;
grant execute on function public.staff_list_course_golden_requests(uuid) to authenticated;
grant execute on function public.staff_review_course_golden(uuid, boolean) to authenticated;
grant execute on function public.list_active_courses() to authenticated;
grant execute on function public.list_my_course_classes_board(uuid) to authenticated;
grant execute on function public.get_my_course_class_watch(uuid) to authenticated;
