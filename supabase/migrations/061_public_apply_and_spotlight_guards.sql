-- Phase 4: Public apply only for open jobs before deadline; spotlight hides past-deadline jobs.

create or replace function public.get_public_job_lead_capacity(p_job_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_cnt bigint;
  v_status text;
  v_deadline date;
begin
  if p_job_id is null then
    return jsonb_build_object('ok', false, 'error', 'Job id required.');
  end if;

  select j.application_limit, j.status, j.application_deadline
  into v_limit, v_status, v_deadline
  from public.jobs j
  where j.id = p_job_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;

  select count(*)::bigint into v_cnt from public.free_job_leads where job_id = p_job_id;

  if v_status is distinct from 'open' then
    return jsonb_build_object(
      'ok', true,
      'application_limit', v_limit,
      'filled', v_cnt,
      'remaining', 0,
      'accepts_applications', false,
      'closed_reason', 'job_not_open'
    );
  end if;

  if v_deadline is not null and v_deadline < (current_timestamp at time zone 'Asia/Kolkata')::date then
    return jsonb_build_object(
      'ok', true,
      'application_limit', v_limit,
      'filled', v_cnt,
      'remaining', 0,
      'accepts_applications', false,
      'closed_reason', 'deadline_passed'
    );
  end if;

  if v_limit is null then
    return jsonb_build_object(
      'ok', true,
      'application_limit', null::int,
      'filled', v_cnt,
      'remaining', null::int,
      'accepts_applications', true
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'application_limit', v_limit,
    'filled', v_cnt,
    'remaining', greatest(0, v_limit - v_cnt::integer),
    'accepts_applications', (v_cnt < v_limit)
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to load capacity'));
end;
$$;

comment on function public.get_public_job_lead_capacity(uuid) is
  'Public job page: capacity vs application_limit; rejects when job not open or apply deadline passed (Asia/Kolkata calendar date).';

create or replace function public.submit_free_job_lead(
  p_job_id uuid,
  p_track text,
  p_name text,
  p_email text,
  p_contact_number text,
  p_skills text,
  p_experience_years text default null,
  p_previous_company text default null,
  p_role_played text default null,
  p_current_ctc text default null,
  p_extra_note text default null,
  p_resume_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_cnt bigint;
  v_status text;
  v_deadline date;
begin
  if p_job_id is null or p_track is null or p_name is null or p_email is null or p_contact_number is null or p_skills is null then
    return jsonb_build_object('ok', false, 'error', 'Required fields are missing.');
  end if;

  if p_resume_url is null or trim(p_resume_url) = '' then
    return jsonb_build_object('ok', false, 'error', 'Resume is required.');
  end if;

  if p_track not in ('fresher', 'experienced') then
    return jsonb_build_object('ok', false, 'error', 'Invalid track.');
  end if;

  perform pg_advisory_xact_lock(8872341, hashtext(p_job_id::text));

  select j.application_limit, j.status, j.application_deadline
  into v_limit, v_status, v_deadline
  from public.jobs j
  where j.id = p_job_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;

  if v_status is distinct from 'open' then
    return jsonb_build_object('ok', false, 'error', 'This job is not accepting applications.');
  end if;

  if v_deadline is not null and v_deadline < (current_timestamp at time zone 'Asia/Kolkata')::date then
    return jsonb_build_object('ok', false, 'error', 'The application deadline has passed.');
  end if;

  if v_limit is not null then
    select count(*)::bigint into v_cnt from public.free_job_leads where job_id = p_job_id;
    if v_cnt >= v_limit then
      return jsonb_build_object('ok', false, 'error', 'Applications for this role are full. Please explore other openings.');
    end if;
  end if;

  insert into public.free_job_leads (
    job_id, track, name, email, contact_number, skills,
    experience_years, previous_company, role_played, current_ctc, extra_note, resume_url
  ) values (
    p_job_id, p_track, trim(p_name), trim(p_email), trim(p_contact_number), trim(p_skills),
    nullif(trim(p_experience_years), ''), nullif(trim(p_previous_company), ''),
    nullif(trim(p_role_played), ''), nullif(trim(p_current_ctc), ''),
    nullif(trim(p_extra_note), ''), trim(p_resume_url)
  );

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to submit lead'));
end;
$$;

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
    select j.id, j.title, j.company_name, j.location
    from public.jobs j
    where j.status = 'open'
      and j.show_on_landing = true
      and j.hiring_spotlight = true
      and (j.application_deadline is null or j.application_deadline >= v_today)
    order by j.hiring_spotlight_order asc, j.created_at desc
    limit 12
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
        'notices', v_notices,
        'shortlisted', v_shortlisted
      )
    );
  end loop;

  return v_out;
end;
$$;

comment on function public.get_landing_hiring_spotlight() is
  'Anonymous: open spotlight jobs still within application_deadline (Asia/Kolkata), notices + shortlisted.';
