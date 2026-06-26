-- Allow aspirant to switch plan while a pending (unpaid) order exists.
-- Run after 079.

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
  v_pending public.payment_orders%rowtype;
  v_submitted uuid;
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

  select id into v_submitted
  from public.payment_orders
  where aspirant_id = v_uid and status = 'submitted'
  limit 1;
  if found then
    return jsonb_build_object('ok', false, 'error', 'You already have a payment awaiting verification', 'existing_order_id', v_submitted);
  end if;

  select * into v_pending
  from public.payment_orders
  where aspirant_id = v_uid and status = 'pending'
  order by created_at desc
  limit 1
  for update;

  if found then
    update public.payment_orders
    set
      plan = v_plan,
      amount_inr = p_amount_inr,
      duration_months = p_duration_months,
      updated_at = now()
  where id = v_pending.id
    returning id into v_id;
  else
    insert into public.payment_orders (aspirant_id, plan, amount_inr, duration_months, status)
    values (v_uid, v_plan, p_amount_inr, p_duration_months, 'pending')
    returning id into v_id;
  end if;

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
