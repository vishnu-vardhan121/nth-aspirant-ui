-- Extended aspirant profile fields (experience, role, links, compensation).
-- Run after 078.

alter table public.aspirants
  add column if not exists experience_years numeric(4,1),
  add column if not exists primary_role text,
  add column if not exists current_company text,
  add column if not exists previous_company text,
  add column if not exists employment_status text,
  add column if not exists work_mode text default 'any',
  add column if not exists current_ctc text,
  add column if not exists expected_salary_min text,
  add column if not exists expected_salary_max text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text,
  add column if not exists secondary_skills text[] default '{}',
  add column if not exists bio text,
  add column if not exists available_from date,
  add column if not exists willing_relocate boolean not null default false,
  add column if not exists country text;

comment on column public.aspirants.experience_years is 'Total years of professional experience; 0 for freshers.';
comment on column public.aspirants.primary_role is 'Target role e.g. Full Stack Developer, Java Backend.';
comment on column public.aspirants.employment_status is 'working | notice | unemployed | student';
comment on column public.aspirants.work_mode is 'any | remote | hybrid | onsite';

-- Admin profile view includes extended fields
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
    'skills', a.skills,
    'secondary_skills', a.secondary_skills,
    'resume_url', a.resume_url
  ) into v_row
  from public.aspirants a
  where a.id = p_aspirant_id;
  return coalesce(v_row, 'null'::jsonb);
end;
$$;
