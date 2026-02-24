-- Direct interview (job application) limits per plan, same pattern as mock_limits.
-- Stored in site_settings so admins can adjust; defaults match pricing: Base 1, Silver 2, Gold 8.

-- ========== 1) Default direct_interview_limits in site_settings ==========
insert into public.site_settings (key, value)
values ('direct_interview_limits', '{"base": 1, "silver": 2, "gold": 8}'::jsonb)
on conflict (key) do nothing;

-- ========== 2) get_job_applications_limit: read from site_settings, fallback 1,2,8 ==========
create or replace function public.get_job_applications_limit(plan_name text)
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
  select value into v_limits from public.site_settings where key = 'direct_interview_limits';
  if v_limits is not null then
    v_val := (v_limits ->> lower(plan_name))::int;
    if v_val is not null then
      return v_val;
    end if;
  end if;
  return case lower(plan_name)
    when 'base' then 1
    when 'silver' then 2
    when 'gold' then 8
    else 0
  end;
end;
$$;

comment on function public.get_job_applications_limit(text) is 'Direct interviews / job applications per plan per month. Reads from site_settings.direct_interview_limits; fallback Base 1, Silver 2, Gold 8.';

-- ========== 3) set_direct_interview_limits (admin only) ==========
create or replace function public.set_direct_interview_limits(p_base int default null, p_silver int default null, p_gold int default null)
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
  select value into v_limits from public.site_settings where key = 'direct_interview_limits';
  v_limits := coalesce(v_limits, '{"base": 1, "silver": 2, "gold": 8}'::jsonb);
  if p_base is not null then v_limits := jsonb_set(v_limits, '{base}', to_jsonb(p_base::int)); end if;
  if p_silver is not null then v_limits := jsonb_set(v_limits, '{silver}', to_jsonb(p_silver::int)); end if;
  if p_gold is not null then v_limits := jsonb_set(v_limits, '{gold}', to_jsonb(p_gold::int)); end if;
  insert into public.site_settings (key, value, updated_at)
  values ('direct_interview_limits', v_limits, now())
  on conflict (key) do update set value = v_limits, updated_at = now();
  return jsonb_build_object('ok', true, 'limits', v_limits);
end;
$$;

comment on function public.set_direct_interview_limits(int, int, int) is 'Admin only: set direct interview (job application) limits per plan.';
