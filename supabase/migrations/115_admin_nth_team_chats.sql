-- Admin Messages: list only aspirants with NTH Team (personal) chat history, sorted by unread then recent.

create or replace function public.get_aspirants_for_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', c.aspirant_id,
        'email', a.email,
        'full_name', a.full_name,
        'unread_count', c.unread_count,
        'last_message_at', c.last_message_at,
        'last_preview', c.last_preview
      )
      order by c.unread_count desc, c.last_message_at desc nulls last, a.full_name
    ), '[]'::jsonb)
    from (
      select
        x.aspirant_id,
        coalesce(u.cnt, 0) as unread_count,
        max(x.created_at) as last_message_at,
        (
          select left(replace(trim(m2.body), E'\n', ' '), 100)
          from public.messages m2
          where (
              m2.to_aspirant_id = x.aspirant_id
              or m2.from_aspirant_id = x.aspirant_id
            )
            and m2.job_id is null
            and m2.mock_registration_id is null
            and m2.from_interviewer_id is null
            and m2.to_interviewer_id is null
            and m2.batch_id is null
          order by m2.created_at desc
          limit 1
        ) as last_preview
      from (
        select m.to_aspirant_id as aspirant_id, m.created_at
        from public.messages m
        where m.to_aspirant_id is not null
          and m.job_id is null
          and m.mock_registration_id is null
          and m.from_interviewer_id is null
          and m.to_interviewer_id is null
          and m.batch_id is null
        union all
        select m.from_aspirant_id, m.created_at
        from public.messages m
        where m.from_aspirant_id is not null
          and m.job_id is null
          and m.mock_registration_id is null
          and m.to_interviewer_id is null
          and m.batch_id is null
      ) x
      left join (
        select from_aspirant_id, count(*)::int as cnt
        from public.messages
        where from_aspirant_id is not null
          and job_id is null
          and admin_read_at is null
          and to_interviewer_id is null
          and batch_id is null
        group by from_aspirant_id
      ) u on u.from_aspirant_id = x.aspirant_id
      group by x.aspirant_id, u.cnt
    ) c
    join public.aspirants a on a.id = c.aspirant_id
  );
end;
$$;

comment on function public.get_aspirants_for_admin() is
  'Admin Messages: aspirants with NTH Team (personal) chat only; unread_count, last preview, recent first.';

grant execute on function public.get_aspirants_for_admin() to authenticated;
