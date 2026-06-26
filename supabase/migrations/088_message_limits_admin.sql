-- Admin-configurable daily message reply limits per plan (team & job chats).
-- Defaults: Base 1, Silver 3, Gold 5. Use -1 for unlimited.

insert into public.site_settings (key, value)
values ('message_limits', '{"base": 1, "silver": 3, "gold": 5}'::jsonb)
on conflict (key) do nothing;

create or replace function public.get_daily_message_limit(plan_name text)
returns int
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_limits jsonb;
  v_val int;
begin
  select value into v_limits from public.site_settings where key = 'message_limits';
  if v_limits is not null then
    v_val := (v_limits ->> lower(plan_name))::int;
    if v_val is not null then
      return v_val;
    end if;
  end if;
  return case lower(plan_name)
    when 'base' then 1
    when 'silver' then 3
    when 'gold' then 5
    else 0
  end;
end;
$$;

comment on function public.get_daily_message_limit(text) is
  'Daily aspirant message replies per plan (team & job chats). Reads site_settings.message_limits; -1 = unlimited.';

create or replace function public.set_message_limits(
  p_base int default null,
  p_silver int default null,
  p_gold int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limits jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  select value into v_limits from public.site_settings where key = 'message_limits';
  v_limits := coalesce(v_limits, '{"base": 1, "silver": 3, "gold": 5}'::jsonb);
  if p_base is not null then v_limits := jsonb_set(v_limits, '{base}', to_jsonb(p_base::int)); end if;
  if p_silver is not null then v_limits := jsonb_set(v_limits, '{silver}', to_jsonb(p_silver::int)); end if;
  if p_gold is not null then v_limits := jsonb_set(v_limits, '{gold}', to_jsonb(p_gold::int)); end if;
  insert into public.site_settings (key, value, updated_at)
  values ('message_limits', v_limits, now())
  on conflict (key) do update set value = v_limits, updated_at = now();
  return jsonb_build_object('ok', true, 'limits', v_limits);
end;
$$;

comment on function public.set_message_limits(int, int, int) is
  'Admin only: set daily message reply limits per plan. -1 = unlimited.';

grant execute on function public.set_message_limits(int, int, int) to authenticated;

grant execute on function public.get_daily_message_limit(text) to authenticated;

-- Usage + send: respect -1 unlimited; mock-interviewer replies do not count toward daily limit
create or replace function public.get_aspirant_daily_message_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_limit int;
  v_used int;
  v_active boolean;
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a where a.id = v_uid;

  v_active := (v_plan is not null and public.is_subscription_active(v_plan, v_started_at));
  v_limit := public.get_daily_message_limit(v_plan);

  select count(*) into v_used
  from public.messages
  where from_aspirant_id = v_uid
    and to_interviewer_id is null
    and created_at >= date_trunc('day', now());

  return jsonb_build_object('used', v_used, 'limit', coalesce(v_limit, 0), 'active', v_active);
end;
$$;

create or replace function public.send_aspirant_reply(p_body text, p_job_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_limit int;
  v_used int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_body is null or trim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'Message body required');
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Choose a plan to message.');
  end if;

  v_limit := public.get_daily_message_limit(v_plan);

  if v_limit is null then
    v_limit := 0;
  end if;

  if v_limit >= 0 then
    select count(*) into v_used
    from public.messages
    where from_aspirant_id = v_uid
      and to_interviewer_id is null
      and created_at >= date_trunc('day', now());

    if v_used >= v_limit then
      return jsonb_build_object(
        'ok', false,
        'error', 'Daily message limit reached (' || v_limit || ' per day). Try again tomorrow.'
      );
    end if;
  else
    v_used := 0;
  end if;

  insert into public.messages (from_aspirant_id, job_id, body)
  values (v_uid, p_job_id, trim(p_body));

  return jsonb_build_object(
    'ok', true,
    'used', case when v_limit < 0 then v_used else v_used + 1 end,
    'limit', v_limit
  );
end;
$$;
