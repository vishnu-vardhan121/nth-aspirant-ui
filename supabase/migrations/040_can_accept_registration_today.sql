-- Check if we can accept a registration/lead today (daily signup limit). Callable by anon; does not consume a slot.

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
  from public.signup_log
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
