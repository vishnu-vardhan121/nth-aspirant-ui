-- Filterable aspirant profile columns for admin search (domain, qualification, branch, CGPA, etc.).

alter table public.aspirants
  add column if not exists job_domain text,
  add column if not exists job_domain_other text,
  add column if not exists job_domains text[] not null default '{}',
  add column if not exists role_title text,
  add column if not exists role_specializations text[] not null default '{}',
  add column if not exists highest_qualification text,
  add column if not exists degree_branch text,
  add column if not exists degree_branch_other text,
  add column if not exists graduation_year int,
  add column if not exists is_currently_studying boolean not null default false,
  add column if not exists expected_graduation_year int,
  add column if not exists graduation_score_type text,
  add column if not exists graduation_score numeric(4,2),
  add column if not exists college_name text,
  add column if not exists premier_institute_type text not null default 'none',
  add column if not exists institute_tier text not null default 'unrated',
  add column if not exists education_path text,
  add column if not exists intermediate_type text,
  add column if not exists communication_level text not null default 'not_assessed',
  add column if not exists notice_period text;

comment on column public.aspirants.job_domain is 'Primary target domain slug (legacy; first of job_domains)';
comment on column public.aspirants.job_domains is 'Up to 5 target career domains (known slugs or custom labels)';
comment on column public.aspirants.highest_qualification is 'btech | be | bsc | bca | mtech | mca | diploma | mba | other';
comment on column public.aspirants.degree_branch is 'Branch code; depends on highest_qualification';
comment on column public.aspirants.premier_institute_type is 'none | iit | nit | iiit';
comment on column public.aspirants.institute_tier is 'tier_1 | tier_2 | tier_3 | unrated';
comment on column public.aspirants.communication_level is 'excellent | good | average | needs_improvement | not_assessed';
comment on column public.aspirants.notice_period is 'immediate | days_15_30 | days_30_60 | days_60_90';
comment on column public.aspirants.available_from is 'Last working day or earliest join date (optional).';

create index if not exists aspirants_job_domain_idx on public.aspirants (job_domain);
create index if not exists aspirants_job_domains_gin on public.aspirants using gin (job_domains);
create index if not exists aspirants_highest_qualification_idx on public.aspirants (highest_qualification);
create index if not exists aspirants_degree_branch_idx on public.aspirants (degree_branch);
create index if not exists aspirants_graduation_year_idx on public.aspirants (graduation_year);
create index if not exists aspirants_graduation_score_idx on public.aspirants (graduation_score);
create index if not exists aspirants_premier_institute_type_idx on public.aspirants (premier_institute_type);
create index if not exists aspirants_institute_tier_idx on public.aspirants (institute_tier);
create index if not exists aspirants_communication_level_idx on public.aspirants (communication_level);
create index if not exists aspirants_notice_period_idx on public.aspirants (notice_period);
create index if not exists aspirants_role_specializations_gin on public.aspirants using gin (role_specializations);

-- Backfill filter columns from legacy education JSON where possible.
update public.aspirants a
set
  highest_qualification = case lower(trim(coalesce(a.education->'graduation'->>'type', '')))
    when 'b.tech' then 'btech'
    when 'btech' then 'btech'
    when 'b.e' then 'be'
    when 'be' then 'be'
    when 'b.sc' then 'bsc'
    when 'bsc' then 'bsc'
    when 'bca' then 'bca'
    when 'm.tech' then 'mtech'
    when 'mtech' then 'mtech'
    when 'mca' then 'mca'
    when 'diploma' then 'diploma'
    when 'mba' then 'mba'
    else null
  end,
  degree_branch = case lower(trim(coalesce(a.education->'graduation'->>'branch', '')))
    when 'cse' then 'cse'
    when 'computer science' then 'computer_science'
    when 'it' then 'it'
    when 'ece' then 'ece'
    when 'eee' then 'eee'
    when 'mechanical' then 'mechanical'
    when 'civil' then 'civil'
    else nullif(lower(trim(a.education->'graduation'->>'branch')), '')
  end,
  graduation_year = nullif(trim(coalesce(a.education->'graduation'->>'year', '')), '')::int,
  role_title = coalesce(a.role_title, a.primary_role)
where a.highest_qualification is null
   or a.degree_branch is null
   or a.graduation_year is null
   or a.role_title is null;

update public.aspirants a
set job_domains = case
  when job_domain = 'other' and nullif(trim(job_domain_other), '') is not null
    then array[trim(job_domain_other)]
  when nullif(trim(job_domain), '') is not null
    then array[trim(job_domain)]
  else job_domains
end
where cardinality(coalesce(job_domains, '{}')) = 0
  and nullif(trim(coalesce(job_domain, '')), '') is not null;

create or replace function public.save_my_aspirant_profile(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.aspirants%rowtype;
  v_skills text[];
  v_secondary text[];
  v_specs text[];
  v_job_domains text[];
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if exists (select 1 from public.admins where id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'Staff accounts use the admin panel, not aspirant profile');
  end if;
  if p_payload is null or p_payload = '{}'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'Profile data required');
  end if;
  if nullif(trim(coalesce(p_payload->>'full_name', '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Full name is required');
  end if;
  if nullif(trim(coalesce(p_payload->>'email', '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Email is required');
  end if;
  if nullif(trim(coalesce(p_payload->>'city', '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'City is required');
  end if;
  if nullif(trim(coalesce(p_payload->>'degree_branch', '')), '') = 'other'
     and nullif(trim(coalesce(p_payload->>'degree_branch_other', '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Please specify your branch / course when Other is selected');
  end if;
  if nullif(trim(coalesce(p_payload->>'highest_qualification', '')), '') = 'other'
     and nullif(trim(coalesce(p_payload->'education'->'graduation'->>'type', '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Please specify your qualification when Other is selected');
  end if;
  if nullif(trim(coalesce(p_payload->>'premier_institute_type', '')), '') in ('iit', 'nit', 'iiit')
     and coalesce(nullif(trim(coalesce(p_payload->>'institute_tier', '')), ''), 'unrated') not in (
       'tier_1', 'tier_2', 'tier_3'
     ) then
    return jsonb_build_object('ok', false, 'error', 'Select college tier (Tier 1, 2, or 3) for IIT / NIT / IIIT');
  end if;

  select coalesce(array_agg(x), '{}')
  into v_skills
  from jsonb_array_elements_text(coalesce(p_payload->'skills', '[]'::jsonb)) as t(x);

  select coalesce(array_agg(x), '{}')
  into v_secondary
  from jsonb_array_elements_text(coalesce(p_payload->'secondary_skills', '[]'::jsonb)) as t(x);

  select coalesce(array_agg(x), '{}')
  into v_specs
  from jsonb_array_elements_text(coalesce(p_payload->'role_specializations', '[]'::jsonb)) as t(x);

  select coalesce(array_agg(distinct trim(x)), '{}')
  into v_job_domains
  from jsonb_array_elements_text(coalesce(p_payload->'job_domains', '[]'::jsonb)) as t(x)
  where nullif(trim(x), '') is not null;

  if cardinality(v_job_domains) = 0
     and nullif(trim(coalesce(p_payload->>'job_domain', '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Add at least one target domain');
  end if;
  if cardinality(v_job_domains) > 5 then
    return jsonb_build_object('ok', false, 'error', 'You can add up to 5 domains');
  end if;

  insert into public.aspirants (
    id,
    full_name,
    email,
    phone,
    city,
    country,
    track,
    experience_years,
    primary_role,
    job_domain,
    job_domain_other,
    job_domains,
    role_title,
    role_specializations,
    current_company,
    previous_company,
    employment_status,
    work_mode,
    current_ctc,
    expected_salary_min,
    expected_salary_max,
    available_from,
    willing_relocate,
    linkedin_url,
    portfolio_url,
    bio,
    education,
    education_path,
    intermediate_type,
    highest_qualification,
    degree_branch,
    degree_branch_other,
    graduation_year,
    is_currently_studying,
    expected_graduation_year,
    graduation_score_type,
    graduation_score,
    college_name,
    premier_institute_type,
    institute_tier,
    communication_level,
    notice_period,
    skills,
    secondary_skills,
    resume_url,
    updated_at
  ) values (
    v_uid,
    trim(p_payload->>'full_name'),
    trim(p_payload->>'email'),
    nullif(trim(coalesce(p_payload->>'phone', '')), ''),
    trim(p_payload->>'city'),
    nullif(trim(coalesce(p_payload->>'country', '')), ''),
    nullif(trim(coalesce(p_payload->>'track', '')), ''),
    nullif(trim(coalesce(p_payload->>'experience_years', '')), '')::numeric,
    nullif(trim(coalesce(p_payload->>'primary_role', '')), ''),
    nullif(trim(coalesce(p_payload->>'job_domain', '')), ''),
    nullif(trim(coalesce(p_payload->>'job_domain_other', '')), ''),
    case when cardinality(v_job_domains) > 0 then v_job_domains else '{}'::text[] end,
    nullif(trim(coalesce(p_payload->>'role_title', '')), ''),
    v_specs,
    nullif(trim(coalesce(p_payload->>'current_company', '')), ''),
    nullif(trim(coalesce(p_payload->>'previous_company', '')), ''),
    nullif(trim(coalesce(p_payload->>'employment_status', '')), ''),
    coalesce(nullif(trim(coalesce(p_payload->>'work_mode', '')), ''), 'any'),
    nullif(trim(coalesce(p_payload->>'current_ctc', '')), ''),
    nullif(trim(coalesce(p_payload->>'expected_salary_min', '')), ''),
    nullif(trim(coalesce(p_payload->>'expected_salary_max', '')), ''),
    nullif(trim(coalesce(p_payload->>'available_from', '')), '')::date,
    coalesce((p_payload->>'willing_relocate')::boolean, false),
    nullif(trim(coalesce(p_payload->>'linkedin_url', '')), ''),
    nullif(trim(coalesce(p_payload->>'portfolio_url', '')), ''),
    nullif(trim(coalesce(p_payload->>'bio', '')), ''),
    coalesce(p_payload->'education', '{}'::jsonb),
    nullif(trim(coalesce(p_payload->>'education_path', '')), ''),
    nullif(trim(coalesce(p_payload->>'intermediate_type', '')), ''),
    nullif(trim(coalesce(p_payload->>'highest_qualification', '')), ''),
    nullif(trim(coalesce(p_payload->>'degree_branch', '')), ''),
    nullif(trim(coalesce(p_payload->>'degree_branch_other', '')), ''),
    nullif(trim(coalesce(p_payload->>'graduation_year', '')), '')::int,
    coalesce((p_payload->>'is_currently_studying')::boolean, false),
    nullif(trim(coalesce(p_payload->>'expected_graduation_year', '')), '')::int,
    nullif(trim(coalesce(p_payload->>'graduation_score_type', '')), ''),
    nullif(trim(coalesce(p_payload->>'graduation_score', '')), '')::numeric,
    nullif(trim(coalesce(p_payload->>'college_name', '')), ''),
    coalesce(nullif(trim(coalesce(p_payload->>'premier_institute_type', '')), ''), 'none'),
    coalesce(nullif(trim(coalesce(p_payload->>'institute_tier', '')), ''), 'unrated'),
    coalesce(nullif(trim(coalesce(p_payload->>'communication_level', '')), ''), 'not_assessed'),
    nullif(trim(coalesce(p_payload->>'notice_period', '')), ''),
    v_skills,
    v_secondary,
    nullif(trim(coalesce(p_payload->>'resume_url', '')), ''),
    now()
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    city = excluded.city,
    country = excluded.country,
    track = excluded.track,
    experience_years = excluded.experience_years,
    primary_role = excluded.primary_role,
    job_domain = excluded.job_domain,
    job_domain_other = excluded.job_domain_other,
    job_domains = excluded.job_domains,
    role_title = excluded.role_title,
    role_specializations = excluded.role_specializations,
    current_company = excluded.current_company,
    previous_company = excluded.previous_company,
    employment_status = excluded.employment_status,
    work_mode = excluded.work_mode,
    current_ctc = excluded.current_ctc,
    expected_salary_min = excluded.expected_salary_min,
    expected_salary_max = excluded.expected_salary_max,
    available_from = excluded.available_from,
    willing_relocate = excluded.willing_relocate,
    linkedin_url = excluded.linkedin_url,
    portfolio_url = excluded.portfolio_url,
    bio = excluded.bio,
    education = excluded.education,
    education_path = excluded.education_path,
    intermediate_type = excluded.intermediate_type,
    highest_qualification = excluded.highest_qualification,
    degree_branch = excluded.degree_branch,
    degree_branch_other = excluded.degree_branch_other,
    graduation_year = excluded.graduation_year,
    is_currently_studying = excluded.is_currently_studying,
    expected_graduation_year = excluded.expected_graduation_year,
    graduation_score_type = excluded.graduation_score_type,
    graduation_score = excluded.graduation_score,
    college_name = excluded.college_name,
    premier_institute_type = excluded.premier_institute_type,
    institute_tier = excluded.institute_tier,
    communication_level = coalesce(
      nullif(trim(coalesce(p_payload->>'communication_level', '')), ''),
      public.aspirants.communication_level
    ),
    notice_period = excluded.notice_period,
    skills = excluded.skills,
    secondary_skills = excluded.secondary_skills,
    resume_url = coalesce(excluded.resume_url, public.aspirants.resume_url),
    updated_at = now();

  select * into v_row from public.aspirants where id = v_uid;
  return jsonb_build_object('ok', true, 'profile', to_jsonb(v_row));
end;
$$;

create or replace function public.get_aspirant_profile_for_admin(p_aspirant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
begin
  if not public.is_admin() or p_aspirant_id is null then
    return 'null'::jsonb;
  end if;
  select jsonb_build_object(
    'id', a.id,
    'full_name', a.full_name,
    'email', a.email,
    'phone', a.phone,
    'city', a.city,
    'country', a.country,
    'track', a.track,
    'experience_years', a.experience_years,
    'primary_role', a.primary_role,
    'job_domain', a.job_domain,
    'job_domain_other', a.job_domain_other,
    'job_domains', a.job_domains,
    'role_title', a.role_title,
    'role_specializations', a.role_specializations,
    'current_company', a.current_company,
    'previous_company', a.previous_company,
    'employment_status', a.employment_status,
    'work_mode', a.work_mode,
    'current_ctc', a.current_ctc,
    'expected_salary_min', a.expected_salary_min,
    'expected_salary_max', a.expected_salary_max,
    'linkedin_url', a.linkedin_url,
    'portfolio_url', a.portfolio_url,
    'willing_relocate', a.willing_relocate,
    'available_from', a.available_from,
    'bio', a.bio,
    'education', a.education,
    'education_path', a.education_path,
    'intermediate_type', a.intermediate_type,
    'highest_qualification', a.highest_qualification,
    'degree_branch', a.degree_branch,
    'degree_branch_other', a.degree_branch_other,
    'graduation_year', a.graduation_year,
    'is_currently_studying', a.is_currently_studying,
    'expected_graduation_year', a.expected_graduation_year,
    'graduation_score_type', a.graduation_score_type,
    'graduation_score', a.graduation_score,
    'college_name', a.college_name,
    'premier_institute_type', a.premier_institute_type,
    'institute_tier', a.institute_tier,
    'communication_level', a.communication_level,
    'notice_period', a.notice_period,
    'skills', a.skills,
    'secondary_skills', a.secondary_skills,
    'resume_url', a.resume_url
  ) into v_row
  from public.aspirants a
  where a.id = p_aspirant_id;
  return coalesce(v_row, 'null'::jsonb);
end;
$$;

-- Admin: set communication level after mock / manual review.
create or replace function public.admin_set_aspirant_communication(
  p_aspirant_id uuid,
  p_communication_level text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_aspirant_id is null then
    return jsonb_build_object('ok', false, 'error', 'aspirant_id required');
  end if;
  if p_communication_level is null or trim(p_communication_level) = '' then
    return jsonb_build_object('ok', false, 'error', 'communication_level required');
  end if;
  if trim(p_communication_level) not in (
    'excellent', 'good', 'average', 'needs_improvement', 'not_assessed'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Invalid communication level');
  end if;

  update public.aspirants
  set communication_level = trim(p_communication_level), updated_at = now()
  where id = p_aspirant_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Aspirant not found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_aspirant_communication(uuid, text) to authenticated;
