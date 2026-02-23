-- Apply daily signup limit to pricing leads: check limit before accepting, and count each lead in signup_log.

create or replace function public.submit_pricing_lead(
  p_plan_id text,
  p_track text,
  p_email text,
  p_contact_number text,
  p_name text default null,
  p_looking_for_role text default null,
  p_graduation_pass text default null,
  p_current_company text default null,
  p_experience_years text default null,
  p_current_ctc text default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_count int;
  v_val jsonb;
begin
  if p_plan_id is null or p_track is null or p_email is null or trim(p_email) = '' or p_contact_number is null or trim(p_contact_number) = '' then
    return jsonb_build_object('ok', false, 'error', 'Plan, track, email and contact number are required.');
  end if;
  if p_track not in ('fresher', 'experienced') then
    return jsonb_build_object('ok', false, 'error', 'Invalid track.');
  end if;

  -- Enforce daily signup/registration limit (same logic as can_accept_registration_today)
  select value into v_val from public.site_settings where key = 'daily_signup_limit';
  v_limit := -1;
  if v_val is not null then
    v_limit := case jsonb_typeof(v_val) when 'number' then (v_val #>> '{}')::int else (v_val #>> '{}')::int end;
  end if;
  if v_limit is null then
    v_limit := -1;
  end if;
  if v_limit >= 0 then
    select count(*) into v_count
    from public.signup_log
    where created_at >= date_trunc('day', now() at time zone 'UTC');
    if v_count >= v_limit then
      return jsonb_build_object('ok', false, 'error', 'Registrations are closed for today. Please try again after 24 hours.');
    end if;
  end if;

  insert into public.pricing_leads (
    plan_id, track, name, looking_for_role, email, contact_number, graduation_pass,
    current_company, experience_years, current_ctc, message
  ) values (
    trim(p_plan_id), p_track, nullif(trim(p_name), ''), nullif(trim(p_looking_for_role), ''),
    trim(p_email), trim(p_contact_number), nullif(trim(p_graduation_pass), ''),
    nullif(trim(p_current_company), ''), nullif(trim(p_experience_years), ''), nullif(trim(p_current_ctc), ''),
    nullif(trim(p_message), '')
  );

  -- Count this lead toward the daily limit (so can_accept_registration_today and future submissions see it)
  insert into public.signup_log (created_at) values (now());

  return jsonb_build_object('ok', true);
end;
$$;
