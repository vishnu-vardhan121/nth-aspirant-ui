-- Course Golden payments: screenshot proof (same pattern as placement payment_orders).

alter table public.course_payment_orders
  add column if not exists screenshot_path text;

comment on column public.course_payment_orders.screenshot_path is
  'Storage path in payment-proofs bucket (aspirantId/course/orderId/proof.ext).';

drop function if exists public.submit_course_payment_proof(uuid, text, text);

create or replace function public.submit_course_payment_proof(
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
  v_order public.course_payment_orders%rowtype;
  v_utr text := upper(trim(coalesce(p_utr, '')));
  v_note text := nullif(trim(coalesce(p_payer_note, '')), '');
  v_shot text := nullif(trim(coalesce(p_screenshot_path, '')), '');
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
  if v_shot is null then
    return jsonb_build_object('ok', false, 'error', 'Payment screenshot is required');
  end if;
  -- Must be under this aspirant's folder
  if position(v_uid::text || '/course/' in v_shot) <> 1 then
    return jsonb_build_object('ok', false, 'error', 'Invalid screenshot path');
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
    screenshot_path = v_shot,
    submitted_at = coalesce(submitted_at, now()),
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object('ok', true, 'order', to_jsonb(v_order));
end;
$$;

grant execute on function public.submit_course_payment_proof(uuid, text, text, text) to authenticated;
