-- Daily signup limit: admin sets max signups per day; signup page checks before allowing registration.
-- Run after 005 (is_admin).

-- 1) Key-value settings (admin-editable)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default 'null',
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is 'App-wide settings. E.g. daily_signup_limit (number, -1 = unlimited).';

alter table public.site_settings enable row level security;

-- Only admins can read/write site_settings (RPCs use security definer to read, so no policy needed for anon)
create policy "site_settings_admin_all"
  on public.site_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Default: unlimited (-1) so existing deployments are not restricted
insert into public.site_settings (key, value)
values ('daily_signup_limit', '-1'::jsonb)
on conflict (key) do nothing;

-- Store numeric limit as jsonb number (e.g. 10 or -1)

-- 2) One row per signup (used to count today's signups)
create table if not exists public.signup_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

comment on table public.signup_log is 'One row per signup; used to enforce daily signup limit.';

alter table public.signup_log enable row level security;

-- No direct client access; only RPCs (security definer) read/insert
create policy "signup_log_no_direct"
  on public.signup_log for all
  using (false)
  with check (false);

-- 3) Reserve a signup slot for today. Call before signUp(); -1 limit = unlimited.
create or replace function public.try_signup_slot()
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
  select value into v_val from public.site_settings where key = 'daily_signup_limit';
  v_limit := -1;
  if v_val is not null then
    v_limit := case jsonb_typeof(v_val) when 'number' then (v_val #>> '{}')::int else (v_val #>> '{}')::int end;
  end if;
  if v_limit is null or v_limit < 0 then
    v_limit := -1;
  end if;
  if v_limit < 0 then
    insert into public.signup_log (created_at) values (now());
    return jsonb_build_object('ok', true);
  end if;
  select count(*) into v_count
  from public.signup_log
  where created_at >= date_trunc('day', now() at time zone 'UTC');
  if v_count >= v_limit then
    return jsonb_build_object('ok', false, 'error', 'Daily signup limit reached. Try again tomorrow.');
  end if;
  insert into public.signup_log (created_at) values (now());
  return jsonb_build_object('ok', true);
end;
$$;

-- 4) Admin: set daily signup limit (-1 = unlimited)
create or replace function public.set_daily_signup_limit(p_limit int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_limit < -1 then
    return jsonb_build_object('ok', false, 'error', 'Invalid limit');
  end if;
  insert into public.site_settings (key, value, updated_at)
  values ('daily_signup_limit', to_jsonb(p_limit), now())
  on conflict (key) do update set value = to_jsonb(p_limit), updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- 5) Admin: get current limit and today's signup count (for settings UI)
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
  from public.signup_log
  where created_at >= date_trunc('day', now() at time zone 'UTC');
  return jsonb_build_object('limit', v_limit, 'count_today', coalesce(v_count, 0));
end;
$$;
