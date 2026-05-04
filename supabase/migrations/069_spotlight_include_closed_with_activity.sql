-- Spotlight: keep jobs visible on landing when closed or past apply deadline if there is
-- timeline activity (notices) or shortlisted people — so hiring narrative still shows.
-- Also return application_deadline + job_status for client countdown / labels.

create or replace function public.get_landing_hiring_spotlight()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb := '[]'::jsonb;
  jrec record;
  v_notices jsonb;
  v_shortlisted jsonb;
  v_today date := (current_timestamp at time zone 'Asia/Kolkata')::date;
begin
  for jrec in
    select j.id, j.title, j.company_name, j.location, j.application_deadline, j.status
    from public.jobs j
    where j.hiring_spotlight = true
      and (
        (
          j.status = 'open'
          and (j.application_deadline is null or j.application_deadline >= v_today)
        )
        or exists (select 1 from public.job_landing_notices n where n.job_id = j.id limit 1)
        or exists (
          select 1 from public.applications a
          where a.job_id = j.id and a.status = 'shortlisted'
          limit 1
        )
        or exists (
          select 1 from public.free_job_leads f
          where f.job_id = j.id and f.status = 'shortlisted'
          limit 1
        )
      )
    order by j.hiring_spotlight_order asc nulls last, j.created_at desc
    limit 24
  loop
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'message', t.body,
        'at', to_char(timezone('Asia/Kolkata', t.created_at), 'FMDD Mon, HH12:MI AM')
      ) order by t.created_at desc
    ), '[]'::jsonb)
    into v_notices
    from (
      select n.id, n.body, n.created_at
      from public.job_landing_notices n
      where n.job_id = jrec.id
      order by n.created_at desc
      limit 20
    ) t;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', x.aid,
        'name', x.nm,
        'city', x.ct
      ) order by x.sort_ts desc
    ), '[]'::jsonb)
    into v_shortlisted
    from (
      select a.id as aid,
        p.full_name as nm,
        coalesce(nullif(trim(p.city), ''), nullif(trim(jrec.location), ''), '—'::text) as ct,
        a.created_at as sort_ts
      from public.applications a
      join public.aspirants p on p.id = a.aspirant_id
      where a.job_id = jrec.id and a.status = 'shortlisted'
      union all
      select f.id as aid,
        f.name as nm,
        coalesce(nullif(trim(jrec.location), ''), '—'::text) as ct,
        f.created_at as sort_ts
      from public.free_job_leads f
      where f.job_id = jrec.id and f.status = 'shortlisted'
    ) x;

    v_out := v_out || jsonb_build_array(
      jsonb_build_object(
        'id', jrec.id,
        'title', jrec.title,
        'company_name', jrec.company_name,
        'location', jrec.location,
        'application_deadline', jrec.application_deadline,
        'job_status', jrec.status,
        'notices', v_notices,
        'shortlisted', v_shortlisted
      )
    );
  end loop;

  return jsonb_build_object('jobs', v_out);
end;
$$;

comment on function public.get_landing_hiring_spotlight() is
  'Anonymous: { jobs: [...] } for hiring_spotlight roles. Open + in-window apply, OR any role with notices/shortlisted (incl. closed / past deadline). Includes application_deadline + job_status.';

grant execute on function public.get_landing_hiring_spotlight() to anon;
grant execute on function public.get_landing_hiring_spotlight() to authenticated;
