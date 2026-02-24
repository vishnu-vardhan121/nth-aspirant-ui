-- Use pricing lead count for the daily limit (not signup_log). Admin sees "leads today"; form is restricted by lead count.

-- 1) can_accept_registration_today: count today's pricing_leads
create or replace function public.can_accept_registration_today()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_limit int;
  v_count int;
  v_val jsonb;
begin
  select value into v_val from public.site_settings where key = 'daily_signup_limit';
  v_limit := -1;
  if v_val is not null then
    v_limit := case jsonb_typeof(v_val) when 'number' then (v_val #>> '{}')::int else (v_val #>> '{}')::int end;
  end if;
  if v_limit is null or v_limit < 0 then
    return jsonb_build_object('allowed', true);
  end if;
  select count(*) into v_count
  from public.pricing_leads
  where created_at >= date_trunc('day', now() at time zone 'UTC');
  if v_count >= v_limit then
    return jsonb_build_object(
      'allowed', false,
      'message', 'Registrations are closed for today. Please try again after 24 hours.'
    );
  end if;
  return jsonb_build_object('allowed', true);
end;
$$;

-- 2) submit_pricing_lead: check and count pricing_leads only; do not use signup_log
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

  -- Enforce daily lead limit (count today's pricing_leads)
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
    from public.pricing_leads
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

  return jsonb_build_object('ok', true);
end;
$$;

-- 3) get_daily_signup_status: return count_today = today's pricing_leads (so admin sees "leads today")
create or replace function public.get_daily_signup_status()
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
  if not public.is_admin() then
    return jsonb_build_object('limit', -1, 'count_today', 0);
  end if;
  select value into v_val from public.site_settings where key = 'daily_signup_limit';
  v_limit := -1;
  if v_val is not null then
    v_limit := (v_val #>> '{}')::int;
    if v_limit is null then v_limit := -1; end if;
  end if;
  select count(*) into v_count
  from public.pricing_leads
  where created_at >= date_trunc('day', now() at time zone 'UTC');
  return jsonb_build_object('limit', v_limit, 'count_today', coalesce(v_count, 0));
end;
$$;
