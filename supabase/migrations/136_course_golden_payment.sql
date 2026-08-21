-- G3: Choose pack, course payment order (installment 1), admin verify → golden active + Gold plan grant.

create table if not exists public.course_payment_orders (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  member_id uuid not null references public.course_members(id) on delete cascade,
  aspirant_id uuid not null references public.aspirants(id) on delete cascade,
  pack text not null,
  installment_index int not null,
  amount_inr int not null,
  status text not null default 'pending',
  utr text,
  payer_note text,
  admin_notes text,
  reviewed_by uuid references public.admins(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_payment_orders_pack_check check (pack in ('full', 'two', 'three')),
  constraint course_payment_orders_installment_check check (installment_index between 1 and 3),
  constraint course_payment_orders_amount_check check (amount_inr > 0),
  constraint course_payment_orders_status_check check (
    status in ('pending', 'submitted', 'approved', 'rejected')
  )
);

create index if not exists course_payment_orders_course_status_idx
  on public.course_payment_orders (course_id, status);

create index if not exists course_payment_orders_aspirant_idx
  on public.course_payment_orders (aspirant_id, created_at desc);

create index if not exists course_payment_orders_member_idx
  on public.course_payment_orders (member_id, created_at desc);

drop trigger if exists course_payment_orders_updated_at on public.course_payment_orders;
create trigger course_payment_orders_updated_at
  before update on public.course_payment_orders
  for each row execute function public.set_updated_at();

alter table public.course_payment_orders enable row level security;

drop policy if exists "course_payment_orders_ops_all" on public.course_payment_orders;
create policy "course_payment_orders_ops_all"
  on public.course_payment_orders for all to authenticated
  using (public.is_ops_admin())
  with check (public.is_ops_admin());

drop policy if exists "course_payment_orders_own_select" on public.course_payment_orders;
create policy "course_payment_orders_own_select"
  on public.course_payment_orders for select to authenticated
  using (aspirant_id = auth.uid());

-- ========== choose pack ==========
create or replace function public.choose_course_pack(p_course_id uuid, p_pack text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.course_members%rowtype;
  v_pricing public.course_pricing%rowtype;
  v_pack text := lower(trim(coalesce(p_pack, '')));
  v_total int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;
  if v_pack not in ('full', 'two', 'three') then
    return jsonb_build_object('ok', false, 'error', 'Pack must be full, two, or three');
  end if;

  select * into v_member
  from public.course_members
  where course_id = p_course_id and aspirant_id = v_uid
  for update;
  if not found or v_member.status is distinct from 'golden'
     or v_member.access_state is distinct from 'awaiting_payment' then
    return jsonb_build_object('ok', false, 'error', 'Not eligible to choose a pack');
  end if;

  if v_member.chosen_pack is not null then
    return jsonb_build_object(
      'ok', true,
      'chosen_pack', v_member.chosen_pack,
      'installments_total', v_member.installments_total,
      'already_chosen', true
    );
  end if;

  select * into v_pricing from public.course_pricing where course_id = p_course_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pricing not set yet');
  end if;

  v_total := case v_pack when 'full' then 1 when 'two' then 2 else 3 end;

  update public.course_members
  set
    chosen_pack = v_pack,
    installments_total = v_total,
    installments_paid = 0,
    updated_at = now()
  where id = v_member.id
  returning * into v_member;

  return jsonb_build_object(
    'ok', true,
    'chosen_pack', v_member.chosen_pack,
    'installments_total', v_member.installments_total,
    'already_chosen', false
  );
end;
$$;

-- ========== create order for next unpaid installment (usually #1) ==========
create or replace function public.create_course_payment_order(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.course_members%rowtype;
  v_pricing public.course_pricing%rowtype;
  v_order public.course_payment_orders%rowtype;
  v_idx int;
  v_amount int;
  v_open uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  select * into v_member
  from public.course_members
  where course_id = p_course_id and aspirant_id = v_uid
  for update;
  if not found or v_member.status is distinct from 'golden' then
    return jsonb_build_object('ok', false, 'error', 'Not a Golden member');
  end if;
  if v_member.access_state not in ('awaiting_payment', 'paused', 'active') then
    return jsonb_build_object('ok', false, 'error', 'Cannot create payment in this state');
  end if;
  if v_member.chosen_pack is null then
    return jsonb_build_object('ok', false, 'error', 'Choose a pack first');
  end if;

  -- Active with nothing due: no new order
  if v_member.access_state = 'active'
     and v_member.installments_paid >= coalesce(v_member.installments_total, 0) then
    return jsonb_build_object('ok', false, 'error', 'All installments already paid');
  end if;

  select id into v_open
  from public.course_payment_orders
  where member_id = v_member.id
    and status in ('pending', 'submitted')
  order by created_at desc
  limit 1;
  if v_open is not null then
    select * into v_order from public.course_payment_orders where id = v_open;
    return jsonb_build_object('ok', true, 'order', to_jsonb(v_order), 'existing', true);
  end if;

  select * into v_pricing from public.course_pricing where course_id = p_course_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pricing not set');
  end if;

  v_idx := coalesce(v_member.installments_paid, 0) + 1;
  if v_idx > coalesce(v_member.installments_total, 0) then
    return jsonb_build_object('ok', false, 'error', 'No installment due');
  end if;

  v_amount := case v_member.chosen_pack
    when 'full' then v_pricing.full_amount_inr
    when 'two' then v_pricing.two_amounts_inr[v_idx]
    when 'three' then v_pricing.three_amounts_inr[v_idx]
  end;

  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Invalid installment amount');
  end if;

  insert into public.course_payment_orders (
    course_id, member_id, aspirant_id, pack, installment_index, amount_inr, status
  )
  values (
    p_course_id, v_member.id, v_uid, v_member.chosen_pack, v_idx, v_amount, 'pending'
  )
  returning * into v_order;

  return jsonb_build_object(
    'ok', true,
    'order', to_jsonb(v_order),
    'existing', false,
    'upi_id', v_pricing.upi_id,
    'upi_payee_name', v_pricing.upi_payee_name,
    'instructions', v_pricing.instructions
  );
end;
$$;

create or replace function public.submit_course_payment_proof(
  p_order_id uuid,
  p_utr text,
  p_payer_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.course_payment_orders%rowtype;
  v_utr text := upper(trim(coalesce(p_utr, '')));
  v_note text := nullif(trim(coalesce(p_payer_note, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_order_id is null then
    return jsonb_build_object('ok', false, 'error', 'order_id required');
  end if;
  if char_length(v_utr) < 6 then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid UTR / reference (min 6 characters)');
  end if;
  if char_length(v_utr) > 64 then
    return jsonb_build_object('ok', false, 'error', 'UTR too long');
  end if;

  select * into v_order
  from public.course_payment_orders
  where id = p_order_id and aspirant_id = v_uid
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;
  if v_order.status not in ('pending', 'submitted') then
    return jsonb_build_object('ok', false, 'error', 'Order cannot be updated');
  end if;

  update public.course_payment_orders
  set
    status = 'submitted',
    utr = v_utr,
    payer_note = v_note,
    submitted_at = coalesce(submitted_at, now()),
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object('ok', true, 'order', to_jsonb(v_order));
end;
$$;

create or replace function public.get_my_course_payment_order(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.course_payment_orders%rowtype;
  v_pricing public.course_pricing%rowtype;
  v_member public.course_members%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_member
  from public.course_members
  where course_id = p_course_id and aspirant_id = v_uid and status = 'golden';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Not enrolled as Golden');
  end if;

  select * into v_order
  from public.course_payment_orders
  where member_id = v_member.id
    and status in ('pending', 'submitted')
  order by created_at desc
  limit 1;

  select * into v_pricing from public.course_pricing where course_id = p_course_id;

  return jsonb_build_object(
    'ok', true,
    'member', jsonb_build_object(
      'chosen_pack', v_member.chosen_pack,
      'access_state', v_member.access_state,
      'installments_paid', v_member.installments_paid,
      'installments_total', v_member.installments_total,
      'next_due_at', v_member.next_due_at
    ),
    'order', case when v_order.id is null then null else to_jsonb(v_order) end,
    'pricing', case when v_pricing.course_id is null then null else jsonb_build_object(
      'upi_id', v_pricing.upi_id,
      'upi_payee_name', v_pricing.upi_payee_name,
      'instructions', v_pricing.instructions,
      'full_amount_inr', v_pricing.full_amount_inr,
      'two_amounts_inr', to_jsonb(v_pricing.two_amounts_inr),
      'three_amounts_inr', to_jsonb(v_pricing.three_amounts_inr)
    ) end
  );
end;
$$;

create or replace function public.admin_list_course_payment_orders(
  p_course_id uuid,
  p_status text default null
)
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
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      o.*,
      a.full_name as aspirant_name,
      a.email as aspirant_email,
      a.phone as aspirant_phone
    from public.course_payment_orders o
    join public.aspirants a on a.id = o.aspirant_id
    where o.course_id = p_course_id
      and (v_status is null or o.status = v_status)
    order by o.created_at desc
    limit 300
  ) t;

  return jsonb_build_object('ok', true, 'orders', v_rows);
end;
$$;

create or replace function public.admin_review_course_payment(
  p_order_id uuid,
  p_approve boolean,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.course_payment_orders%rowtype;
  v_member public.course_members%rowtype;
  v_notes text := nullif(trim(coalesce(p_admin_notes, '')), '');
  v_plan_res jsonb;
  v_paid int;
  v_total int;
  v_next timestamptz;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_order_id is null or p_approve is null then
    return jsonb_build_object('ok', false, 'error', 'order_id and approve required');
  end if;

  select * into v_order
  from public.course_payment_orders
  where id = p_order_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;
  if v_order.status is distinct from 'submitted' then
    return jsonb_build_object('ok', false, 'error', 'Only submitted orders can be reviewed');
  end if;

  select * into v_member
  from public.course_members
  where id = v_order.member_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Member not found');
  end if;

  if not p_approve then
    update public.course_payment_orders
    set
      status = 'rejected',
      admin_notes = v_notes,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    where id = p_order_id;
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  -- Approve
  update public.course_payment_orders
  set
    status = 'approved',
    admin_notes = v_notes,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_order_id;

  v_paid := coalesce(v_member.installments_paid, 0) + 1;
  v_total := coalesce(v_member.installments_total, 1);

  if v_paid >= v_total then
    v_next := null;
  else
    v_next := (timezone('Asia/Kolkata', now())::date + interval '1 month')
              at time zone 'Asia/Kolkata';
  end if;

  update public.course_members
  set
    installments_paid = v_paid,
    access_state = case
      when v_paid >= v_total then 'completed'
      else 'active'
    end,
    next_due_at = v_next,
    updated_at = now()
  where id = v_member.id
  returning * into v_member;

  -- First approved payment: grant Gold plan (new enroll). Validity follows platform Gold rules.
  if v_order.installment_index = 1 then
    v_plan_res := public.admin_set_aspirant_plan(v_order.aspirant_id, 'gold', now());
    if not coalesce((v_plan_res->>'ok')::boolean, false) then
      -- Payment approved; surface plan error but don't roll back payment
      return jsonb_build_object(
        'ok', true,
        'status', 'approved',
        'access_state', v_member.access_state,
        'installments_paid', v_member.installments_paid,
        'gold_grant_ok', false,
        'gold_grant_error', coalesce(v_plan_res->>'error', 'Gold grant failed')
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'approved',
    'access_state', v_member.access_state,
    'installments_paid', v_member.installments_paid,
    'installments_total', v_member.installments_total,
    'next_due_at', v_member.next_due_at,
    'gold_grant_ok', v_order.installment_index = 1
  );
end;
$$;

grant execute on function public.choose_course_pack(uuid, text) to authenticated;
grant execute on function public.create_course_payment_order(uuid) to authenticated;
grant execute on function public.submit_course_payment_proof(uuid, text, text) to authenticated;
grant execute on function public.get_my_course_payment_order(uuid) to authenticated;
grant execute on function public.admin_list_course_payment_orders(uuid, text) to authenticated;
grant execute on function public.admin_review_course_payment(uuid, boolean, text) to authenticated;
