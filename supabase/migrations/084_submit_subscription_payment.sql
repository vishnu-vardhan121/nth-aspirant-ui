-- One-step subscription payment submit: always creates a fresh order + saves proof.
-- Fixes "payment in progress" when aspirant resubmits after closing the modal.
-- Also replaces create_payment_order to never block.

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

  insert into public.payment_orders (aspirant_id, plan, amount_inr, duration_months, status)
  values (v_uid, v_plan, p_amount_inr, p_duration_months, 'pending')
  returning id into v_id;

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

create or replace function public.submit_subscription_payment(
  p_plan text,
  p_amount_inr int,
  p_duration_months int,
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
  v_plan text := lower(trim(coalesce(p_plan, '')));
  v_utr text := trim(coalesce(p_utr, ''));
  v_create jsonb;
  v_order_id uuid;
  v_proof jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if length(v_utr) < 8 or length(v_utr) > 50 then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid UTR / transaction reference (8–50 characters)');
  end if;
  if v_utr !~ '^[A-Za-z0-9\-]+$' then
    return jsonb_build_object('ok', false, 'error', 'UTR may only contain letters, numbers, and hyphens');
  end if;

  v_create := public.create_payment_order(p_plan, p_amount_inr, p_duration_months);
  if not coalesce((v_create->>'ok')::boolean, false) then
    return v_create;
  end if;

  v_order_id := (v_create->'order'->>'id')::uuid;

  v_proof := public.submit_payment_proof(
    v_order_id,
    v_utr,
    p_payer_note,
    p_screenshot_path
  );

  if not coalesce((v_proof->>'ok')::boolean, false) then
    return v_proof;
  end if;

  return v_proof || jsonb_build_object('order_id', v_order_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'This transaction reference was already submitted');
end;
$$;

comment on function public.submit_subscription_payment(text, int, int, text, text, text) is
  'Aspirant: create order + submit UPI proof in one step. Never blocked by older orders.';
