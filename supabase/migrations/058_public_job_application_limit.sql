-- Public (landing / job page) application cap: enforce jobs.application_limit
-- against count(rows in free_job_leads for that job). NULL limit = unlimited.

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
begin
  if p_job_id is null then
    return jsonb_build_object('ok', false, 'error', 'Job id required.');
  end if;

  select j.application_limit
  into v_limit
  from public.jobs j
  where j.id = p_job_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;

  select count(*)::bigint into v_cnt from public.free_job_leads where job_id = p_job_id;

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
  'Public job page: remaining slots for free_job_leads vs jobs.application_limit (null = unlimited).';

grant execute on function public.get_public_job_lead_capacity(uuid) to anon;
grant execute on function public.get_public_job_lead_capacity(uuid) to authenticated;

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

  select j.application_limit into v_limit
  from public.jobs j
  where j.id = p_job_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
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
