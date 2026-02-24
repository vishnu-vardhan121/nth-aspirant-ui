-- Mock flow: requested (initial) -> scheduled (admin set date/link) -> completed | no_show.
-- requested = pending; no_show = user didn't join, slot freed so they can request again.
-- Run after 019.

-- Allow new statuses: requested, no_show (keep scheduled, completed, cancelled)
do $$
declare
  c name;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.mock_registrations'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.mock_registrations drop constraint %I', c);
  end loop;
  alter table public.mock_registrations add constraint mock_registrations_status_check
    check (status in ('requested', 'scheduled', 'completed', 'cancelled', 'no_show'));
end $$;

comment on column public.mock_registrations.status is 'requested=pending; scheduled=admin set time/link; completed=done; cancelled/no_show=slot freed.';

-- Usage: count requested + scheduled + completed (cancelled and no_show = slot freed)
create or replace function public.get_mock_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_ends_at timestamptz;
  v_limit int;
  v_used int;
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  v_limit := public.get_mock_limit(v_plan);
  v_ends_at := public.subscription_ends_at(v_plan, v_started_at);

  select count(*) into v_used
  from public.mock_registrations
  where aspirant_id = v_uid
    and status in ('requested', 'scheduled', 'completed')
    and created_at >= v_started_at
    and created_at < v_ends_at;

  return jsonb_build_object('used', v_used, 'limit', v_limit, 'active', true);
end;
$$;

-- Aspirant registers -> status = requested (pending)
create or replace function public.register_mock(p_availability_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_ends_at timestamptz;
  v_limit int;
  v_used int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Choose a plan to register for mocks.');
  end if;

  v_limit := public.get_mock_limit(v_plan);
  v_ends_at := public.subscription_ends_at(v_plan, v_started_at);

  select count(*) into v_used
  from public.mock_registrations
  where aspirant_id = v_uid
    and status in ('requested', 'scheduled', 'completed')
    and created_at >= v_started_at
    and created_at < v_ends_at;

  if v_limit >= 0 and v_used >= v_limit then
    return jsonb_build_object('ok', false, 'error', 'Mock limit reached for this period. Upgrade for more.');
  end if;

  insert into public.mock_registrations (aspirant_id, status, availability_notes)
  values (v_uid, 'requested', nullif(trim(p_availability_notes), ''));

  return jsonb_build_object('ok', true);
end;
$$;

-- Admin sets schedule only for requested -> becomes scheduled
create or replace function public.admin_schedule_mock(
  p_registration_id uuid,
  p_scheduled_at timestamptz,
  p_meet_link text default null,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  update public.mock_registrations
  set status = 'scheduled',
      scheduled_at = p_scheduled_at,
      meet_link = nullif(trim(p_meet_link), ''),
      admin_notes = nullif(trim(p_admin_notes), '')
  where id = p_registration_id
    and (status = 'requested' or (status = 'scheduled' and scheduled_at is null));
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or not a pending request');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Admin marks no-show when user didn't join: slot freed (they can request again)
create or replace function public.mark_mock_no_show(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  update public.mock_registrations
  set status = 'no_show'
  where id = p_registration_id and status = 'scheduled';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or not scheduled');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Optional: admin cancel a requested slot (before scheduling) – frees the slot
create or replace function public.mark_mock_cancelled(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  update public.mock_registrations
  set status = 'cancelled'
  where id = p_registration_id and status in ('requested', 'scheduled');
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or cannot cancel');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
