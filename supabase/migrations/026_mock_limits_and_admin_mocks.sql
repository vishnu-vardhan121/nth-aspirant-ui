-- Configurable mock limits per plan + update admin mock RPCs to include slot, interviewer, scores.
-- Run after 028.

-- ========== 1) Default mock_limits in site_settings ==========
insert into public.site_settings (key, value)
values ('mock_limits', '{"base": 3, "silver": 3, "gold": 10}'::jsonb)
on conflict (key) do nothing;

-- ========== 2) get_mock_limit: read from site_settings, fallback 3,3,10 ==========
create or replace function public.get_mock_limit(plan_name text)
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
  select value into v_limits from public.site_settings where key = 'mock_limits';
  if v_limits is not null then
    v_val := (v_limits ->> lower(plan_name))::int;
    if v_val is not null then
      return v_val;
    end if;
  end if;
  return case lower(plan_name)
    when 'base' then 3
    when 'silver' then 3
    when 'gold' then 10
    else 0
  end;
end;
$$;

-- ========== 3) set_mock_limits (admin only) ==========
create or replace function public.set_mock_limits(p_base int default null, p_silver int default null, p_gold int default null)
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
  select value into v_limits from public.site_settings where key = 'mock_limits';
  v_limits := coalesce(v_limits, '{"base": 3, "silver": 3, "gold": 10}'::jsonb);
  if p_base is not null then v_limits := jsonb_set(v_limits, '{base}', to_jsonb(p_base::int)); end if;
  if p_silver is not null then v_limits := jsonb_set(v_limits, '{silver}', to_jsonb(p_silver::int)); end if;
  if p_gold is not null then v_limits := jsonb_set(v_limits, '{gold}', to_jsonb(p_gold::int)); end if;
  insert into public.site_settings (key, value, updated_at)
  values ('mock_limits', v_limits, now())
  on conflict (key) do update set value = v_limits, updated_at = now();
  return jsonb_build_object('ok', true, 'limits', v_limits);
end;
$$;

-- ========== 4) get_admin_mock_registrations: add slot_id, interviewer, scores ==========
create or replace function public.get_admin_mock_registrations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_summary jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('registrations', '[]'::jsonb, 'by_aspirant', '{}'::jsonb);
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_email', a.email,
      'aspirant_name', a.full_name,
      'created_at', r.created_at,
      'status', r.status,
      'availability_notes', r.availability_notes,
      'scheduled_at', r.scheduled_at,
      'meet_link', r.meet_link,
      'admin_notes', r.admin_notes,
      'completed_at', r.completed_at,
      'slot_id', r.slot_id,
      'interviewer_id', r.interviewer_id,
      'interviewer_name', i.name,
      'technical_score', r.technical_score,
      'communication_score', r.communication_score,
      'problem_solving_score', r.problem_solving_score,
      'overall_score', r.overall_score,
      'feedback_notes', r.feedback_notes,
      'feedback_submitted_at', r.feedback_submitted_at
    ) order by r.created_at desc
  ) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  left join public.interviewers i on i.id = r.interviewer_id;

  select jsonb_object_agg(aspirant_id, conducted_count)
  into v_summary
  from (
    select aspirant_id, count(*)::int as conducted_count
    from public.mock_registrations
    where status = 'completed'
    group by aspirant_id
  ) s;

  return jsonb_build_object(
    'registrations', coalesce(v_rows, '[]'::jsonb),
    'by_aspirant', coalesce(v_summary, '{}'::jsonb)
  );
end;
$$;

-- ========== 5) get_admin_mocks_completed_report: add interviewer, scores ==========
create or replace function public.get_admin_mocks_completed_report(p_from_date date default null, p_to_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_from date := coalesce(p_from_date, current_date - 30);
  v_to date := coalesce(p_to_date, current_date);
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'created_at', r.created_at,
      'scheduled_at', r.scheduled_at,
      'completed_at', r.completed_at,
      'meet_link', r.meet_link,
      'status', r.status,
      'interviewer_id', r.interviewer_id,
      'interviewer_name', i.name,
      'technical_score', r.technical_score,
      'communication_score', r.communication_score,
      'problem_solving_score', r.problem_solving_score,
      'overall_score', r.overall_score,
      'feedback_notes', r.feedback_notes
    ) order by coalesce(r.completed_at, r.scheduled_at, r.created_at) desc
  ), '[]'::jsonb) into v_rows
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  left join public.interviewers i on i.id = r.interviewer_id
  where r.status = 'completed'
    and (r.completed_at::date between v_from and v_to
         or (r.completed_at is null and r.scheduled_at is not null and r.scheduled_at::date between v_from and v_to)
         or (r.completed_at is null and r.scheduled_at is null and r.created_at::date between v_from and v_to));
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
