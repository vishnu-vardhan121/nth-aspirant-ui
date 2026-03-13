-- Add resume_url to free_job_leads for resume uploads from the free application form.
alter table public.free_job_leads add column if not exists resume_url text;

comment on column public.free_job_leads.resume_url is 'Storage path (e.g. free-leads/uuid_filename.pdf) for uploaded resume.';

-- Allow anon + authenticated to upload to free-leads/ (logged-in users POST as authenticated).
create policy "resumes_insert_free_leads"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'free-leads'
  );

-- Update submit_free_job_lead to accept and store resume_url.
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
