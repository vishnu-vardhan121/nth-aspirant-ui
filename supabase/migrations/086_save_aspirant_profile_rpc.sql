-- Ensure extended profile columns exist + RPC for onboarding/profile save (avoids PostgREST schema cache errors).

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
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
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

  select coalesce(array_agg(x), '{}')
  into v_skills
  from jsonb_array_elements_text(coalesce(p_payload->'skills', '[]'::jsonb)) as t(x);

  select coalesce(array_agg(x), '{}')
  into v_secondary
  from jsonb_array_elements_text(coalesce(p_payload->'secondary_skills', '[]'::jsonb)) as t(x);

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
    skills = excluded.skills,
    secondary_skills = excluded.secondary_skills,
    resume_url = coalesce(excluded.resume_url, public.aspirants.resume_url),
    updated_at = now();

  select * into v_row from public.aspirants where id = v_uid;
  return jsonb_build_object('ok', true, 'profile', to_jsonb(v_row));
end;
$$;

comment on function public.save_my_aspirant_profile(jsonb) is
  'Aspirant: create or update own profile (onboarding + profile page).';

grant execute on function public.save_my_aspirant_profile(jsonb) to authenticated;
