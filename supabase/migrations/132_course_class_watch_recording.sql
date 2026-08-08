-- Watch recording by class id (enrolled only). Board never returns raw recording_url.
-- Future Golden: courses.recordings_locked_for_free + course_classes.access_tier + member status golden.

alter table public.courses
  add column if not exists recordings_locked_for_free boolean not null default false;

comment on column public.courses.recordings_locked_for_free is
  'When true, status=free members cannot get playback URLs; golden members can.';

alter table public.course_classes
  add column if not exists access_tier text not null default 'free';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'course_classes_access_tier_check'
  ) then
    alter table public.course_classes
      add constraint course_classes_access_tier_check
      check (access_tier in ('free', 'golden'));
  end if;
end $$;

comment on column public.course_classes.access_tier is
  'free = all free enrolled; golden = only golden members (not returned in free list).';

-- Allow golden membership status (future)
alter table public.course_members drop constraint if exists course_members_status_check;
alter table public.course_members
  add constraint course_members_status_check
  check (status in ('requested', 'free', 'rejected', 'golden'));

create or replace function public.course_recording_preview_url(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  v text := trim(coalesce(p_url, ''));
  v_id text;
begin
  if char_length(v) < 8 then
    return null;
  end if;
  -- Already preview
  if v ~* '/preview/?(\?|$)' then
    return regexp_replace(v, '\?.*$', '');
  end if;
  -- Google Drive file id
  v_id := (regexp_match(v, 'drive\.google\.com/file/d/([^/]+)'))[1];
  if v_id is not null and char_length(v_id) >= 10 then
    return 'https://drive.google.com/file/d/' || v_id || '/preview';
  end if;
  -- Fallback: use as-is (YouTube embed etc.)
  return v;
end;
$$;

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
              and m.status = 'free'
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
         and m.status in ('free', 'golden')
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
              and m.status = 'free'
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
         and m.status in ('free', 'golden')
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
    return jsonb_build_object('ok', false, 'error', 'Class is required');
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
    and status in ('free', 'golden');
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Not enrolled');
  end if;

  -- Premium / golden-only classes: never return URL to free members
  if v_cl.access_tier = 'golden' and v_member.status is distinct from 'golden' then
    return jsonb_build_object('ok', false, 'error', 'This class is for Golden Batch only');
  end if;

  if char_length(trim(coalesce(v_cl.recording_url, ''))) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Recording not available yet');
  end if;

  -- After Golden opens: lock recordings for free (flag)
  if v_course.recordings_locked_for_free and v_member.status = 'free' then
    return jsonb_build_object('ok', false, 'error', 'Recording is available for Golden Batch only');
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

grant execute on function public.course_recording_preview_url(text) to authenticated;
grant execute on function public.get_my_course_class_watch(uuid) to authenticated;
grant execute on function public.list_my_course_classes_board(uuid) to authenticated;
