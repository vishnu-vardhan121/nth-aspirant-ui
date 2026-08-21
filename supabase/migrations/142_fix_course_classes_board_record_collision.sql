-- Fix: list_my_course_classes_board threw `record "r" has no field "topics"`.
-- Cause: the `r record` loop variable (pause-sync loop) and the `course_doubt_requests r`
-- subquery alias (my_request_topics / my_request_status) shared the name `r` inside the
-- same function. Renamed loop var to v_pause_row and the subquery alias to dr.

create or replace function public.list_my_course_classes_board(p_course_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_start timestamptz;
  v_pause_row record;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  for v_pause_row in
    select id from public.course_members
    where aspirant_id = auth.uid() and status = 'golden' and access_state = 'active'
      and (p_course_id is null or course_id = p_course_id)
  loop
    perform public.sync_course_member_payment_access(v_pause_row.id);
  end loop;

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
          case
            when m.status = 'golden' and m.access_state = 'paused' then null
            else cl.meet_url_1
          end as meet_url_1,
          case
            when m.status = 'golden' and m.access_state = 'paused' then null
            else cl.meet_url_2
          end as meet_url_2,
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
            and not (
              m.status = 'golden' and m.access_state = 'awaiting_payment' and cl.access_tier = 'golden'
            )
          ) as has_recording,
          (m.status = 'golden' and m.access_state = 'paused') as access_paused,
          (
            select jsonb_agg(jsonb_build_object(
              'id', ds.id,
              'title', ds.title,
              'starts_at', ds.starts_at,
              'meet_url', case
                when m.status = 'golden' and m.access_state = 'paused' then null
                else ds.meet_url
              end
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
            and not (
              m.status = 'golden' and m.access_state = 'awaiting_payment' and cl.access_tier = 'golden'
            )
          ) as has_recording,
          (m.status = 'golden' and m.access_state = 'paused') as access_paused,
          (select dr.topics from public.course_doubt_requests dr
            where dr.class_id = cl.id and dr.aspirant_id = auth.uid() limit 1) as my_request_topics,
          (select dr.status from public.course_doubt_requests dr
            where dr.class_id = cl.id and dr.aspirant_id = auth.uid() limit 1) as my_request_status,
          (select f.body from public.course_class_feedback f
            where f.class_id = cl.id and f.aspirant_id = auth.uid() limit 1) as my_feedback,
          (
            select jsonb_agg(jsonb_build_object(
              'id', ds.id,
              'title', ds.title,
              'starts_at', ds.starts_at,
              'meet_url', case
                when m.status = 'golden' and m.access_state = 'paused' then null
                else ds.meet_url
              end
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

grant execute on function public.list_my_course_classes_board(uuid) to authenticated;
