-- Admin Users page: summary stats and paginated user list with plan/track filters.
-- Run after 020 (mock statuses), 013 (applications.status).
-- Uses: is_admin(), is_subscription_active(), subscription_ends_at(), get_job_applications_limit(), get_mock_limit().

-- ========== 1) get_admin_users_summary() ==========
create or replace function public.get_admin_users_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_active int;
  v_paid int;
  v_plan_base int;
  v_plan_silver int;
  v_plan_gold int;
  v_track_fresher int;
  v_track_experienced int;
  v_apps_month int;
  v_apps_month_active int;
  v_pending_total int;
  v_pending_fresher int;
  v_pending_experienced int;
  v_completed_total int;
  v_completed_fresher int;
  v_completed_experienced int;
begin
  if not public.is_admin() then
    return '{}'::jsonb;
  end if;

  select count(*) into v_total from public.aspirants;

  select count(*) into v_active
  from public.aspirants a
  where public.is_subscription_active(a.plan, a.plan_started_at);

  select count(*) into v_paid
  from public.aspirants a
  where a.plan is not null and a.plan_started_at is not null;

  select count(*) filter (where plan = 'base'), count(*) filter (where plan = 'silver'), count(*) filter (where plan = 'gold')
  into v_plan_base, v_plan_silver, v_plan_gold
  from public.aspirants;

  select count(*) filter (where coalesce(track, 'fresher') = 'fresher'), count(*) filter (where track = 'experienced')
  into v_track_fresher, v_track_experienced
  from public.aspirants;

  select count(*) into v_apps_month
  from public.applications app
  where app.created_at >= date_trunc('month', now()) and coalesce(app.status, 'applied') != 'rejected';

  select count(*) into v_apps_month_active
  from public.applications app
  join public.aspirants a on a.id = app.aspirant_id
  where app.created_at >= date_trunc('month', now()) and coalesce(app.status, 'applied') != 'rejected'
    and public.is_subscription_active(a.plan, a.plan_started_at);

  select count(*) into v_pending_total
  from public.mock_registrations r
  where r.status in ('requested', 'scheduled');

  select count(*) into v_pending_fresher
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  where r.status in ('requested', 'scheduled') and coalesce(a.track, 'fresher') = 'fresher';

  select count(*) into v_pending_experienced
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  where r.status in ('requested', 'scheduled') and a.track = 'experienced';

  select count(*) into v_completed_total from public.mock_registrations where status = 'completed';

  select count(*) into v_completed_fresher
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  where r.status = 'completed' and coalesce(a.track, 'fresher') = 'fresher';

  select count(*) into v_completed_experienced
  from public.mock_registrations r
  join public.aspirants a on a.id = r.aspirant_id
  where r.status = 'completed' and a.track = 'experienced';

  return jsonb_build_object(
    'total_users', v_total,
    'active_users', v_active,
    'paid_users', v_paid,
    'by_plan', jsonb_build_object('base', v_plan_base, 'silver', v_plan_silver, 'gold', v_plan_gold),
    'by_track', jsonb_build_object('fresher', v_track_fresher, 'experienced', v_track_experienced),
    'applications_this_month', v_apps_month,
    'applications_this_month_active', v_apps_month_active,
    'pending_mocks_total', v_pending_total,
    'pending_mocks_fresher', v_pending_fresher,
    'pending_mocks_experienced', v_pending_experienced,
    'completed_mocks_total', v_completed_total,
    'completed_mocks_fresher', v_completed_fresher,
    'completed_mocks_experienced', v_completed_experienced
  );
end;
$$;

-- ========== 2) get_admin_users_list(p_plan, p_track, p_limit, p_offset) ==========
create or replace function public.get_admin_users_list(
  p_plan text default null,
  p_track text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;

  select jsonb_agg(row order by row->>'full_name')
  into v_rows
  from (
    select jsonb_build_object(
      'id', a.id,
      'full_name', a.full_name,
      'email', a.email,
      'plan', a.plan,
      'track', coalesce(a.track, 'fresher'),
      'plan_started_at', a.plan_started_at,
      'created_at', a.created_at,
      'subscription_ends_at', case when a.plan is not null and a.plan_started_at is not null then public.subscription_ends_at(a.plan, a.plan_started_at) else null end,
      'days_until_expiry', case
        when public.is_subscription_active(a.plan, a.plan_started_at) then
          (public.subscription_ends_at(a.plan, a.plan_started_at)::date - current_date)
        else null
      end,
      'is_active', public.is_subscription_active(a.plan, a.plan_started_at),
      'applications_this_month', (
        select count(*)::int from public.applications app
        where app.aspirant_id = a.id and app.created_at >= date_trunc('month', now()) and coalesce(app.status, 'applied') != 'rejected'
      ),
      'application_limit', public.get_job_applications_limit(a.plan),
      'mocks_conducted_in_period', (
        select count(*)::int from public.mock_registrations r
        where r.aspirant_id = a.id and r.status = 'completed'
          and a.plan_started_at is not null and a.plan is not null
          and r.created_at >= a.plan_started_at
          and r.created_at < public.subscription_ends_at(a.plan, a.plan_started_at)
      ),
      'mocks_pending_in_period', (
        select count(*)::int from public.mock_registrations r
        where r.aspirant_id = a.id and r.status in ('requested', 'scheduled')
          and a.plan_started_at is not null and a.plan is not null
          and r.created_at >= a.plan_started_at
          and r.created_at < public.subscription_ends_at(a.plan, a.plan_started_at)
      ),
      'mock_limit', public.get_mock_limit(a.plan)
    ) as row
    from public.aspirants a
    where (p_plan is null or a.plan = p_plan)
      and (p_track is null or (p_track = 'fresher' and coalesce(a.track, 'fresher') = 'fresher') or (p_track = 'experienced' and a.track = 'experienced'))
    order by a.full_name
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0))
  ) sub;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== 3) get_aspirant_profile_for_admin(p_aspirant_id) for View profile ==========
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
    'education', a.education,
    'skills', a.skills,
    'resume_url', a.resume_url
  ) into v_row
  from public.aspirants a
  where a.id = p_aspirant_id;
  return coalesce(v_row, 'null'::jsonb);
end;
$$;
