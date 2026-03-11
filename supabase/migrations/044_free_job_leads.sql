-- Free Job Leads: for unauthenticated users applying to free jobs on landing page.
create table if not exists public.free_job_leads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  track text not null check (track in ('fresher', 'experienced')),
  name text not null,
  email text not null,
  contact_number text not null,
  skills text not null,
  experience_years text,
  previous_company text,
  role_played text,
  current_ctc text,
  extra_note text,
  created_at timestamptz not null default now()
);

comment on table public.free_job_leads is 'Leads from free jobs on landing page for unauthenticated users.';

alter table public.free_job_leads enable row level security;

-- Only admins can view leads
create policy "free_job_leads_admin_select"
  on public.free_job_leads for select
  using (public.is_admin());

-- RPC: submit free job lead (anon allowed)
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
  p_extra_note text default null
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

  if p_track not in ('fresher', 'experienced') then
    return jsonb_build_object('ok', false, 'error', 'Invalid track.');
  end if;

  insert into public.free_job_leads (
    job_id, track, name, email, contact_number, skills,
    experience_years, previous_company, role_played, current_ctc, extra_note
  ) values (
    p_job_id, p_track, trim(p_name), trim(p_email), trim(p_contact_number), trim(p_skills),
    nullif(trim(p_experience_years), ''), nullif(trim(p_previous_company), ''), 
    nullif(trim(p_role_played), ''), nullif(trim(p_current_ctc), ''),
    nullif(trim(p_extra_note), '')
  );

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to submit lead'));
end;
$$;
