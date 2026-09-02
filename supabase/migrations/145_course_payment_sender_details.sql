-- Capture sender name (as per bank account), sender UPI ID, and payment app used —
-- for admin to cross-check against the screenshot without digging into bank statements.
-- New params are appended as optional/defaulted so any already-deployed frontend still
-- calling the old 4-arg shape keeps working unchanged (drop-then-recreate as ONE function,
-- not a second overload, so PostgREST never has to disambiguate between two candidates).

alter table public.course_payment_orders
  add column if not exists sender_name text,
  add column if not exists sender_upi_id text,
  add column if not exists payment_app text;

comment on column public.course_payment_orders.sender_name is
  'Payer name as shown on their bank account / UPI app — for admin cross-check against screenshot.';
comment on column public.course_payment_orders.sender_upi_id is
  'Payer UPI ID (VPA), e.g. name@okhdfcbank — for admin cross-check.';
comment on column public.course_payment_orders.payment_app is
  'UPI app used to pay (gpay, phonepe, paytm, bhim, other) — optional.';

drop function if exists public.submit_course_payment_proof(uuid, text, text, text);

create or replace function public.submit_course_payment_proof(
  p_order_id uuid,
  p_utr text,
  p_payer_note text default null,
  p_screenshot_path text default null,
  p_sender_name text default null,
  p_sender_upi_id text default null,
  p_payment_app text default null
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
  v_sender_name text := nullif(trim(coalesce(p_sender_name, '')), '');
  v_sender_upi text := nullif(lower(trim(coalesce(p_sender_upi_id, ''))), '');
  v_app text := nullif(lower(trim(coalesce(p_payment_app, ''))), '');
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
  if v_sender_name is not null and char_length(v_sender_name) > 120 then
    return jsonb_build_object('ok', false, 'error', 'Sender name too long');
  end if;
  if v_sender_upi is not null and char_length(v_sender_upi) > 120 then
    return jsonb_build_object('ok', false, 'error', 'UPI ID too long');
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
    sender_name = coalesce(v_sender_name, sender_name),
    sender_upi_id = coalesce(v_sender_upi, sender_upi_id),
    payment_app = coalesce(v_app, payment_app),
    submitted_at = coalesce(submitted_at, now()),
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object('ok', true, 'order', to_jsonb(v_order));
end;
$$;

grant execute on function public.submit_course_payment_proof(uuid, text, text, text, text, text, text) to authenticated;
