-- UPI payment orders: aspirant pays offline, submits UTR + screenshot, admin approves → plan activated.
-- payment_config in site_settings: upi_id, payee_name, instructions only.
-- Plan price and duration come from the app (subscriptionProducts.js) when creating an order.

-- ========== 1) payment_config row (UPI only — no prices in DB) ==========
insert into public.site_settings (key, value)
values (
  'payment_config',
  jsonb_build_object(
    'upi_id', '',
    'payee_name', 'Naveen Talent Hub',
    'instructions', 'Pay the exact amount shown. Include the order reference in the payment note if your UPI app allows it.'
  )
)
on conflict (key) do nothing;

-- ========== 2) payment_orders table ==========
-- Drop first so re-runs work after a failed/partial apply (old stub tables won't block this).
drop table if exists public.payment_orders cascade;

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  aspirant_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('base', 'silver')),
  amount_inr int not null check (amount_inr > 0),
  duration_months int not null check (duration_months > 0),
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'approved', 'rejected')),
  utr text,
  payer_note text,
  screenshot_path text,
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payment_orders is 'Self-serve UPI subscription orders; admin approves after manual bank check.';

create index if not exists payment_orders_aspirant_id_idx on public.payment_orders (aspirant_id);
create index if not exists payment_orders_status_idx on public.payment_orders (status);
create unique index if not exists payment_orders_utr_active_unique
  on public.payment_orders (lower(trim(utr)))
  where utr is not null and trim(utr) <> '' and status in ('submitted', 'approved');

alter table public.payment_orders enable row level security;

drop policy if exists "payment_orders_select_own" on public.payment_orders;
create policy "payment_orders_select_own"
  on public.payment_orders for select
  using (auth.uid() = aspirant_id);

drop policy if exists "payment_orders_select_admin" on public.payment_orders;
create policy "payment_orders_select_admin"
  on public.payment_orders for select
  using (public.is_admin());

-- ========== 3) Storage: payment-proofs bucket ==========
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists "payment_proofs_insert_own" on storage.objects;
create policy "payment_proofs_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "payment_proofs_select_own" on storage.objects;
create policy "payment_proofs_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "payment_proofs_select_admin" on storage.objects;
create policy "payment_proofs_select_admin"
  on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and public.is_admin());

-- ========== 4) Helpers ==========
create or replace function public.get_payment_config_internal()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.site_settings where key = 'payment_config'),
    jsonb_build_object(
      'upi_id', '',
      'payee_name', 'Naveen Talent Hub',
      'instructions', ''
    )
  );
$$;

-- ========== 5) get_payment_config (authenticated) ==========
create or replace function public.get_payment_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cfg jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  v_cfg := public.get_payment_config_internal();
  return jsonb_build_object(
    'ok', true,
    'upi_id', coalesce(v_cfg->>'upi_id', ''),
    'payee_name', coalesce(v_cfg->>'payee_name', 'Naveen Talent Hub'),
    'instructions', coalesce(v_cfg->>'instructions', '')
  );
end;
$$;

-- ========== 6) set_payment_config (admin) ==========
create or replace function public.set_payment_config(p_config jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upi text := trim(coalesce(p_config->>'upi_id', ''));
  v_name text := trim(coalesce(p_config->>'payee_name', 'Naveen Talent Hub'));
  v_instructions text := coalesce(p_config->>'instructions', '');
  v_merged jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  v_merged := jsonb_build_object(
    'upi_id', v_upi,
    'payee_name', v_name,
    'instructions', v_instructions
  );
  insert into public.site_settings (key, value, updated_at)
  values ('payment_config', v_merged, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- ========== 7) get_active_payment_order ==========
create or replace function public.get_active_payment_order()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.payment_orders%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  select * into v_row
  from public.payment_orders
  where aspirant_id = v_uid and status in ('pending', 'submitted')
  order by created_at desc
  limit 1;
  if not found then
    return jsonb_build_object('ok', true, 'order', null);
  end if;
  return jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object(
      'id', v_row.id,
      'plan', v_row.plan,
      'amount_inr', v_row.amount_inr,
      'duration_months', v_row.duration_months,
      'status', v_row.status,
      'utr', v_row.utr,
      'payer_note', v_row.payer_note,
      'screenshot_path', v_row.screenshot_path,
      'created_at', v_row.created_at
    )
  );
end;
$$;

-- ========== 8) create_payment_order ==========
-- Amount and duration are sent from the app (subscriptionProducts.js); server only validates.
create or replace function public.create_payment_order(
  p_plan text,
  p_amount_inr int,
  p_duration_months int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text := lower(trim(coalesce(p_plan, '')));
  v_existing uuid;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if v_plan not in ('base', 'silver') then
    return jsonb_build_object('ok', false, 'error', 'Plan must be base or silver');
  end if;
  if p_amount_inr is null or p_amount_inr <= 0 or p_amount_inr > 1000000 then
    return jsonb_build_object('ok', false, 'error', 'Invalid amount');
  end if;
  if p_duration_months is null or p_duration_months <= 0 or p_duration_months > 24 then
    return jsonb_build_object('ok', false, 'error', 'Invalid subscription duration');
  end if;

  select id into v_existing
  from public.payment_orders
  where aspirant_id = v_uid and status in ('pending', 'submitted')
  limit 1;
  if found then
    update public.payment_orders
    set
      plan = v_plan,
      amount_inr = p_amount_inr,
      duration_months = p_duration_months,
      status = 'pending',
      utr = null,
      payer_note = null,
      screenshot_path = null,
      updated_at = now()
    where id = v_existing
    returning id into v_id;
  else
    insert into public.payment_orders (aspirant_id, plan, amount_inr, duration_months, status)
    values (v_uid, v_plan, p_amount_inr, p_duration_months, 'pending')
    returning id into v_id;
  end if;

  -- removed: block when payment already in progress

  return jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object(
      'id', v_id,
      'plan', v_plan,
      'amount_inr', p_amount_inr,
      'duration_months', p_duration_months,
      'status', 'pending'
    )
  );
end;
$$;

-- ========== 9) submit_payment_proof ==========
create or replace function public.submit_payment_proof(
  p_order_id uuid,
  p_utr text,
  p_payer_note text default null,
  p_screenshot_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_utr text := trim(coalesce(p_utr, ''));
  v_row public.payment_orders%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_order_id is null then
    return jsonb_build_object('ok', false, 'error', 'order_id required');
  end if;
  if length(v_utr) < 8 or length(v_utr) > 50 then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid UTR / transaction reference (8–50 characters)');
  end if;
  if v_utr !~ '^[A-Za-z0-9\-]+$' then
    return jsonb_build_object('ok', false, 'error', 'UTR may only contain letters, numbers, and hyphens');
  end if;

  select * into v_row
  from public.payment_orders
  where id = p_order_id and aspirant_id = v_uid
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'This order cannot accept payment proof');
  end if;

  update public.payment_orders
  set
    utr = v_utr,
    payer_note = nullif(trim(coalesce(p_payer_note, '')), ''),
    screenshot_path = nullif(trim(coalesce(p_screenshot_path, '')), ''),
    status = 'submitted',
    updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'status', 'submitted');
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'This transaction reference was already submitted');
end;
$$;

-- ========== 10) admin_list_payment_orders ==========
create or replace function public.admin_list_payment_orders(p_status text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
  v_rows jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      po.id,
      po.aspirant_id,
      po.plan,
      po.amount_inr,
      po.duration_months,
      po.status,
      po.utr,
      po.payer_note,
      po.screenshot_path,
      po.admin_notes,
      po.reviewed_at,
      po.created_at,
      po.updated_at,
      a.full_name as aspirant_name,
      a.email as aspirant_email
    from public.payment_orders po
    left join public.aspirants a on a.id = po.aspirant_id
    where v_status is null or po.status = v_status
    order by po.created_at desc
    limit 200
  ) t;

  return jsonb_build_object('ok', true, 'orders', v_rows);
end;
$$;

-- ========== 11) admin_review_payment_order ==========
create or replace function public.admin_review_payment_order(
  p_order_id uuid,
  p_action text,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := lower(trim(coalesce(p_action, '')));
  v_row public.payment_orders%rowtype;
  v_plan_result jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_order_id is null then
    return jsonb_build_object('ok', false, 'error', 'order_id required');
  end if;
  if v_action not in ('approve', 'reject') then
    return jsonb_build_object('ok', false, 'error', 'action must be approve or reject');
  end if;

  select * into v_row
  from public.payment_orders
  where id = p_order_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;
  if v_row.status <> 'submitted' then
    return jsonb_build_object('ok', false, 'error', 'Only submitted orders can be reviewed');
  end if;

  if v_action = 'reject' then
    update public.payment_orders
    set
      status = 'rejected',
      admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    where id = p_order_id;
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  v_plan_result := public.admin_set_aspirant_plan(v_row.aspirant_id, v_row.plan, now());
  if not coalesce((v_plan_result->>'ok')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', coalesce(v_plan_result->>'error', 'Failed to activate plan'));
  end if;

  update public.payment_orders
  set
    status = 'approved',
    admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'status', 'approved');
end;
$$;

comment on function public.get_payment_config() is 'Authenticated: UPI checkout details (no plan prices).';
comment on function public.set_payment_config(jsonb) is 'Admin: save UPI payment_config in site_settings.';
comment on function public.create_payment_order(text, int, int) is 'Aspirant: start UPI order; amount and duration from app.';
comment on function public.submit_payment_proof(uuid, text, text, text) is 'Aspirant: submit UTR and optional screenshot path.';
comment on function public.admin_list_payment_orders(text) is 'Admin: list payment orders, optional status filter.';
comment on function public.admin_review_payment_order(uuid, text, text) is 'Admin: approve (activates plan) or reject.';
