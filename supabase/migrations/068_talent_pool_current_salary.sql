-- Optional current CTC alongside expected range (talent pool form).

alter table public.talent_pool_candidates
  add column if not exists current_salary_annual numeric(14, 2);

comment on column public.talent_pool_candidates.current_salary_annual is
  'Optional present annual compensation for context (typically INR).';

-- Signature change: drop old overload so we do not accumulate two submit_talent_pool_candidate functions.
drop function if exists public.submit_talent_pool_candidate(
  text, text, text, text, text, boolean, numeric, boolean, text,
  text[], text[], text, text, numeric, numeric, date, text, text, text,
  integer, boolean, text, text
);

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
  p_current_salary_annual numeric default null,
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
    return jsonb_build_object('ok', false, 'error', 'Expected salary lower bound cannot be greater than upper bound.');
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
    expected_salary_min, expected_salary_max, current_salary_annual, available_from,
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
    p_current_salary_annual,
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
  text[], text[], text, text, numeric, numeric, numeric, date, text, text, text,
  integer, boolean, text, text
) to anon, authenticated;
