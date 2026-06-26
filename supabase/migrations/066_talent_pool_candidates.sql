-- Talent pool: job seekers opt in for future roles; admins search/filter in dashboard.
-- Run after 002 (is_admin, set_updated_at), 018 (resumes bucket).
--
-- If this migration was partially applied before salary columns existed, the ALTERs
-- below add missing columns without recreating the table.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.talent_pool_candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  city text,
  country text,
  willing_to_relocate boolean not null default false,
  years_experience numeric(5, 2),
  is_fresher boolean not null default false,
  employment_status text not null
    check (employment_status in ('working', 'notice', 'unemployed', 'student')),
  primary_skills text[] not null default '{}',
  secondary_skills text[] not null default '{}',
  primary_role text,
  work_mode text not null default 'any'
    check (work_mode in ('remote', 'hybrid', 'onsite', 'any')),
  expected_salary_min numeric(14, 2),
  expected_salary_max numeric(14, 2),
  available_from date,
  linkedin_url text,
  portfolio_url text,
  resume_url text not null,
  communication_level smallint not null
    check (communication_level between 1 and 10),
  consent_given boolean not null,
  consent_at timestamptz not null default now(),
  consent_policy_version text not null default 'v1',
  source text not null default 'talent_pool_landing',
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'shortlisted', 'contacted', 'placed', 'archived')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.talent_pool_candidates
  add column if not exists expected_salary_min numeric(14, 2);
alter table public.talent_pool_candidates
  add column if not exists expected_salary_max numeric(14, 2);

comment on table public.talent_pool_candidates is
  'Opt-in candidate profiles for future openings; public submits via RPC, admins manage.';
comment on column public.talent_pool_candidates.expected_salary_min is
  'Optional lower bound of expected annual compensation (same currency as max; typically INR).';
comment on column public.talent_pool_candidates.expected_salary_max is
  'Optional upper bound of expected annual compensation (same currency as min; typically INR).';

create index if not exists talent_pool_candidates_created_at_idx
  on public.talent_pool_candidates (created_at desc);

create index if not exists talent_pool_candidates_primary_skills_gin
  on public.talent_pool_candidates using gin (primary_skills);

create index if not exists talent_pool_candidates_secondary_skills_gin
  on public.talent_pool_candidates using gin (secondary_skills);

create index if not exists talent_pool_candidates_years_idx
  on public.talent_pool_candidates (years_experience);

create index if not exists talent_pool_candidates_comm_level_idx
  on public.talent_pool_candidates (communication_level);

create index if not exists talent_pool_candidates_status_idx
  on public.talent_pool_candidates (status);

drop trigger if exists talent_pool_candidates_updated_at on public.talent_pool_candidates;
create trigger talent_pool_candidates_updated_at
  before update on public.talent_pool_candidates
  for each row execute function public.set_updated_at();

alter table public.talent_pool_candidates enable row level security;

drop policy if exists "talent_pool_admin_select" on public.talent_pool_candidates;
create policy "talent_pool_admin_select"
  on public.talent_pool_candidates for select
  to authenticated
  using (public.is_admin());

drop policy if exists "talent_pool_admin_update" on public.talent_pool_candidates;
create policy "talent_pool_admin_update"
  on public.talent_pool_candidates for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No public INSERT/DELETE on table; use submit_talent_pool_candidate() only.

-- ---------------------------------------------------------------------------
-- Public submit (security definer)
-- ---------------------------------------------------------------------------
create or replace function public.submit_talent_pool_candidate(
  p_full_name text,
  p_email text,
  p_phone text,
  p_city text default null,
  p_country text default null,
  p_willing_to_relocate boolean default false,
  p_years_experience numeric default null,
  p_is_fresher boolean default false,
  p_employment_status text default null,
  p_primary_skills text[] default null,
  p_secondary_skills text[] default null,
  p_primary_role text default null,
  p_work_mode text default 'any',
  p_expected_salary_min numeric default null,
  p_expected_salary_max numeric default null,
  p_available_from date default null,
  p_linkedin_url text default null,
  p_portfolio_url text default null,
  p_resume_url text default null,
  p_communication_level integer default null,
  p_consent_given boolean default false,
  p_consent_policy_version text default 'v1',
  p_source text default 'talent_pool_landing'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primary text[];
  v_secondary text[];
begin
  if p_full_name is null or trim(p_full_name) = ''
     or p_email is null or trim(p_email) = ''
     or p_phone is null or trim(p_phone) = ''
  then
    return jsonb_build_object('ok', false, 'error', 'Name, email, and phone are required.');
  end if;

  if p_resume_url is null or trim(p_resume_url) = '' then
    return jsonb_build_object('ok', false, 'error', 'Resume is required.');
  end if;

  if coalesce(p_consent_given, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'You must agree to be contacted about opportunities.');
  end if;

  if p_communication_level is null or p_communication_level < 1 or p_communication_level > 10 then
    return jsonb_build_object('ok', false, 'error', 'Communication level must be between 1 and 10.');
  end if;

  if p_employment_status is null
     or p_employment_status not in ('working', 'notice', 'unemployed', 'student') then
    return jsonb_build_object('ok', false, 'error', 'Please select a valid employment status.');
  end if;

  if p_work_mode is null or p_work_mode not in ('remote', 'hybrid', 'onsite', 'any') then
    return jsonb_build_object('ok', false, 'error', 'Please select a valid work mode.');
  end if;

  if p_expected_salary_min is not null
     and p_expected_salary_max is not null
     and p_expected_salary_min > p_expected_salary_max then
    return jsonb_build_object('ok', false, 'error', 'Expected salary minimum cannot be greater than maximum.');
  end if;

  select coalesce(array_agg(lower(trim(t.s)) order by t.ord), array[]::text[])
  into v_primary
  from unnest(coalesce(p_primary_skills, array[]::text[])) with ordinality as t(s, ord)
  where trim(coalesce(s, '')) <> '';

  if v_primary is null or array_length(v_primary, 1) is null or array_length(v_primary, 1) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Add at least one primary skill.');
  end if;

  select coalesce(array_agg(lower(trim(t.s)) order by t.ord), array[]::text[])
  into v_secondary
  from unnest(coalesce(p_secondary_skills, array[]::text[])) with ordinality as t(s, ord)
  where trim(coalesce(s, '')) <> '';

  if coalesce(p_is_fresher, false) is true then
    p_years_experience := coalesce(p_years_experience, 0);
  else
    if p_years_experience is null or p_years_experience < 0 then
      return jsonb_build_object('ok', false, 'error', 'Years of experience is required for non-freshers.');
    end if;
  end if;

  insert into public.talent_pool_candidates (
    full_name, email, phone, city, country, willing_to_relocate,
    years_experience, is_fresher, employment_status,
    primary_skills, secondary_skills, primary_role, work_mode,
    expected_salary_min, expected_salary_max, available_from,
    linkedin_url, portfolio_url, resume_url, communication_level,
    consent_given, consent_policy_version, source
  ) values (
    trim(p_full_name),
    lower(trim(p_email)),
    trim(p_phone),
    nullif(trim(p_city), ''),
    nullif(trim(p_country), ''),
    coalesce(p_willing_to_relocate, false),
    p_years_experience,
    coalesce(p_is_fresher, false),
    p_employment_status,
    v_primary,
    v_secondary,
    nullif(trim(p_primary_role), ''),
    p_work_mode,
    p_expected_salary_min,
    p_expected_salary_max,
    p_available_from,
    nullif(trim(p_linkedin_url), ''),
    nullif(trim(p_portfolio_url), ''),
    trim(p_resume_url),
    p_communication_level::smallint,
    true,
    coalesce(nullif(trim(p_consent_policy_version), ''), 'v1'),
    coalesce(nullif(trim(p_source), ''), 'talent_pool_landing')
  );

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to submit.'));
end;
$$;

grant execute on function public.submit_talent_pool_candidate(
  text, text, text, text, text, boolean, numeric, boolean, text,
  text[], text[], text, text, numeric, numeric, date, text, text, text,
  integer, boolean, text, text
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin update status / notes
-- ---------------------------------------------------------------------------
create or replace function public.update_talent_pool_candidate_admin(
  p_id uuid,
  p_status text default null,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed.');
  end if;

  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'Missing id.');
  end if;

  if p_status is not null
     and p_status not in ('new', 'reviewed', 'shortlisted', 'contacted', 'placed', 'archived') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status.');
  end if;

  update public.talent_pool_candidates
  set
    status = coalesce(p_status, status),
    admin_notes = case when p_admin_notes is null then admin_notes else p_admin_notes end,
    updated_at = now()
  where id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Record not found.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.update_talent_pool_candidate_admin(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: resumes/talent-pool/ (anon + authenticated upload, like free-leads)
-- ---------------------------------------------------------------------------
drop policy if exists "resumes_insert_talent_pool" on storage.objects;

create policy "resumes_insert_talent_pool"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'talent-pool'
  );
