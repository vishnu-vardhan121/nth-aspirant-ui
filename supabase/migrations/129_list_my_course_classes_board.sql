-- Aspirant enrolled board: upcoming + completed classes (IST day split).

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
          cl.recording_url
        from public.course_classes cl
        join public.courses c on c.id = cl.course_id
        join public.course_members m
          on m.course_id = cl.course_id
         and m.aspirant_id = auth.uid()
         and m.status = 'free'
        where cl.starts_at >= v_today_start
          and (p_course_id is null or cl.course_id = p_course_id)
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
          cl.recording_url,
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
        where cl.starts_at < v_today_start
          and (p_course_id is null or cl.course_id = p_course_id)
        order by cl.starts_at desc
        limit 100
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.list_my_course_classes_board(uuid) to authenticated;
