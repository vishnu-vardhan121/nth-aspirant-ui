-- ============================================================================
-- Free job leads: full bootstrap (safe if 044/046 never ran).
-- Run this if you see: relation "public.free_job_leads" does not exist
-- or RLS blocks submit_free_job_lead inserts.
-- ============================================================================

-- 1) Table (same as 044)
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

-- 2) Admin can read (idempotent)
drop policy if exists "free_job_leads_admin_select" on public.free_job_leads;
create policy "free_job_leads_admin_select"
  on public.free_job_leads for select
  using (public.is_admin());

-- 3) Resume column + storage upload under free-leads/
-- Must allow BOTH anon and authenticated: logged-in users POST as authenticated;
-- resumes_insert_own only allows auth.uid() as first folder, so free-leads/ was 403.
alter table public.free_job_leads add column if not exists resume_url text;
comment on column public.free_job_leads.resume_url is 'Storage path (e.g. free-leads/uuid_filename.pdf) for uploaded resume.';

drop policy if exists "resumes_insert_free_leads" on storage.objects;
create policy "resumes_insert_free_leads"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'free-leads'
  );

-- 4) RPC with resume required (046)
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

-- 5) INSERT policy so anon RPC insert is not blocked by RLS
drop policy if exists "free_job_leads_anon_insert" on public.free_job_leads;
drop policy if exists "free_job_leads_insert_anon_authenticated" on public.free_job_leads;

create policy "free_job_leads_insert_anon_authenticated"
  on public.free_job_leads for insert
  to anon, authenticated
  with check (
    job_id is not null
    and track in ('fresher', 'experienced')
    and coalesce(trim(name), '') <> ''
    and coalesce(trim(email), '') <> ''
    and coalesce(trim(contact_number), '') <> ''
    and coalesce(trim(skills), '') <> ''
    and coalesce(trim(resume_url), '') <> ''
  );

comment on policy "free_job_leads_insert_anon_authenticated" on public.free_job_leads is
  'Allows landing free-job form (anon) to insert leads; RPC validates fields.';

-- 6) RPC callable by anon (adjust if permission denied)
grant execute on function public.submit_free_job_lead(
  uuid, text, text, text, text, text, text, text, text, text, text, text
) to anon;
grant execute on function public.submit_free_job_lead(
  uuid, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
