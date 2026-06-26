-- create_payment_order: never block — reuse or reset the aspirant's open order.
-- Run after 080 (or 074 if 080 was not applied).

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
  where aspirant_id = v_uid
    and status in ('pending', 'submitted')
  returning id into v_id;

  if not found then
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

comment on function public.create_payment_order(text, int, int) is
  'Aspirant: start or refresh UPI checkout. Reuses open pending/submitted order; never blocks.';
