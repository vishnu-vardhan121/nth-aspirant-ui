-- 1) get_available_mock_slots: return available slots + slots booked by current user, with booked_by_me flag.
-- 2) cancel_mock_slot: include p_reason in message body to aspirant.
-- 3) mock_reschedule_requests table + RPCs for aspirant request / admin approve or reject.

-- ========== 1) get_available_mock_slots: add booked_by_me, include "my" booked slots ==========
create or replace function public.get_available_mock_slots(p_from_date date default null, p_to_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := coalesce(p_from_date, current_date);
  v_to date := coalesce(p_to_date, current_date + 14);
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'start_at', s.start_at,
      'end_at', s.end_at,
      'interviewer_name', a.name,
      'meet_link', s.meet_link,
      'booked_by_me', (r.id is not null)
    ) order by s.start_at
  ), '[]'::jsonb) into v_rows
  from public.mock_slots s
  join public.admins a on a.id = s.interviewer_id and a.is_interviewer = true
  left join public.mock_registrations r on r.slot_id = s.id and r.aspirant_id = v_uid and r.status = 'scheduled'
  where s.start_at >= now()
    and s.start_at::date >= v_from
    and s.start_at::date <= v_to
    and (
      s.status = 'available'
      or (s.status = 'booked' and r.id is not null)
    );
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== 2) cancel_mock_slot: use p_reason in message to aspirant ==========
create or replace function public.cancel_mock_slot(p_slot_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aspirant_id uuid;
  v_reg_id uuid;
  v_start_at timestamptz;
  v_body text;
begin
  if not public.is_admin() and not (exists (select 1 from public.mock_slots where id = p_slot_id and interviewer_id = auth.uid())) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select r.aspirant_id, r.id, s.start_at into v_aspirant_id, v_reg_id, v_start_at
  from public.mock_slots s
  left join public.mock_registrations r on r.slot_id = s.id and r.status = 'scheduled'
  where s.id = p_slot_id;

  update public.mock_slots set status = 'cancelled', updated_at = now() where id = p_slot_id;
  update public.mock_registrations set status = 'cancelled' where slot_id = p_slot_id and status = 'scheduled';

  if v_aspirant_id is not null then
    v_body := 'Your mock interview on ' || to_char(v_start_at, 'FMDD Mon YYYY') || ' has been cancelled. You can book another slot from the Mocks page.';
    if p_reason is not null and trim(p_reason) <> '' then
      v_body := v_body || ' Reason: ' || trim(p_reason);
    end if;
    insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
    values (auth.uid(), v_aspirant_id, v_body, v_reg_id);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 3) mock_reschedule_requests table ==========
create table if not exists public.mock_reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  mock_registration_id uuid not null references public.mock_registrations(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.mock_reschedule_requests is 'Aspirant requests to reschedule a scheduled mock; admin approves or rejects.';

create index if not exists idx_mock_reschedule_requests_reg on public.mock_reschedule_requests (mock_registration_id);
create index if not exists idx_mock_reschedule_requests_status on public.mock_reschedule_requests (status);

alter table public.mock_reschedule_requests enable row level security;

create policy "mock_reschedule_requests_aspirant_insert_own"
  on public.mock_reschedule_requests for insert
  with check (
    exists (
      select 1 from public.mock_registrations r
      where r.id = mock_registration_id and r.aspirant_id = auth.uid() and r.status = 'scheduled'
    )
  );

create policy "mock_reschedule_requests_aspirant_select_own"
  on public.mock_reschedule_requests for select
  using (
    exists (
      select 1 from public.mock_registrations r
      where r.id = mock_registration_id and r.aspirant_id = auth.uid()
    )
  );

create policy "mock_reschedule_requests_admin_all"
  on public.mock_reschedule_requests for all
  using (public.is_admin())
  with check (public.is_admin());

-- One pending request per registration (partial unique)
create unique index if not exists idx_mock_reschedule_requests_one_pending
  on public.mock_reschedule_requests (mock_registration_id)
  where status = 'pending';

-- ========== 4) request_mock_reschedule (aspirant) ==========
create or replace function public.request_mock_reschedule(p_registration_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_reason is null or trim(p_reason) = '' then
    return jsonb_build_object('ok', false, 'error', 'Reason is required.');
  end if;
  if not exists (
    select 1 from public.mock_registrations r
    where r.id = p_registration_id and r.aspirant_id = v_uid and r.status = 'scheduled'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Registration not found or not scheduled.');
  end if;
  if exists (
    select 1 from public.mock_reschedule_requests
    where mock_registration_id = p_registration_id and status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'error', 'You already have a pending reschedule request for this mock.');
  end if;
  insert into public.mock_reschedule_requests (mock_registration_id, reason)
  values (p_registration_id, trim(p_reason));
  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 5) get_admin_mock_reschedule_requests (admin list pending) ==========
create or replace function public.get_admin_mock_reschedule_requests()
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
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', req.id,
      'mock_registration_id', req.mock_registration_id,
      'reason', req.reason,
      'status', req.status,
      'created_at', req.created_at,
      'aspirant_id', r.aspirant_id,
      'aspirant_name', a.full_name,
      'aspirant_email', a.email,
      'scheduled_at', r.scheduled_at,
      'meet_link', r.meet_link,
      'slot_id', r.slot_id
    ) order by req.created_at asc
  ), '[]'::jsonb) into v_rows
  from public.mock_reschedule_requests req
  join public.mock_registrations r on r.id = req.mock_registration_id
  join public.aspirants a on a.id = r.aspirant_id
  where req.status = 'pending';
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ========== 6) admin_approve_mock_reschedule (admin: approve → reschedule is manual; just mark approved) ==========
create or replace function public.admin_approve_mock_reschedule(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  update public.mock_reschedule_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id and status = 'pending';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found or already reviewed.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 7) admin_reject_mock_reschedule (admin: reject with message to aspirant) ==========
create or replace function public.admin_reject_mock_reschedule(p_request_id uuid, p_message_to_aspirant text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg_id uuid;
  v_aspirant_id uuid;
  v_body text;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  select req.mock_registration_id, r.aspirant_id into v_reg_id, v_aspirant_id
  from public.mock_reschedule_requests req
  join public.mock_registrations r on r.id = req.mock_registration_id
  where req.id = p_request_id and req.status = 'pending';
  if v_reg_id is null then
    return jsonb_build_object('ok', false, 'error', 'Request not found or already reviewed.');
  end if;
  update public.mock_reschedule_requests
  set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;
  v_body := coalesce(nullif(trim(p_message_to_aspirant), ''), 'Your reschedule request could not be approved. Please join the mock at the scheduled time or contact support.');
  insert into public.messages (from_admin_id, to_aspirant_id, body, mock_registration_id)
  values (auth.uid(), v_aspirant_id, v_body, v_reg_id);
  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 8) get_my_pending_reschedule_registration_ids (aspirant: which regs have pending request) ==========
create or replace function public.get_my_pending_reschedule_registration_ids()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;
  return (
    select coalesce(jsonb_agg(req.mock_registration_id), '[]'::jsonb)
    from public.mock_reschedule_requests req
    join public.mock_registrations r on r.id = req.mock_registration_id and r.aspirant_id = v_uid
    where req.status = 'pending'
  );
end;
$$;
