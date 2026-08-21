-- Return UPI details even when reusing an existing open order (fixes pay modal after Continue).

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
  v_due jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  select * into v_member
  from public.course_members
  where course_id = p_course_id and aspirant_id = v_uid;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Not a Golden member');
  end if;

  v_member := public.sync_course_member_payment_access(v_member.id);

  if v_member.status is distinct from 'golden' then
    return jsonb_build_object('ok', false, 'error', 'Not a Golden member');
  end if;
  if v_member.chosen_pack is null then
    return jsonb_build_object('ok', false, 'error', 'Choose a pack first');
  end if;

  v_due := public.course_member_due_info(v_member);
  if not coalesce((v_due->>'can_pay_next')::boolean, false) then
    if v_member.access_state = 'active' and coalesce((v_due->>'remaining_installments')::int, 0) > 0 then
      return jsonb_build_object(
        'ok', false,
        'error', 'Next installment opens 7 days before the due date',
        'due', v_due
      );
    end if;
    return jsonb_build_object('ok', false, 'error', 'No installment due right now', 'due', v_due);
  end if;

  select * into v_pricing from public.course_pricing where course_id = p_course_id;

  select id into v_open
  from public.course_payment_orders
  where member_id = v_member.id
    and status in ('pending', 'submitted')
  order by created_at desc
  limit 1;
  if v_open is not null then
    select * into v_order from public.course_payment_orders where id = v_open;
    return jsonb_build_object(
      'ok', true,
      'order', to_jsonb(v_order),
      'existing', true,
      'due', v_due,
      'upi_id', v_pricing.upi_id,
      'upi_payee_name', v_pricing.upi_payee_name,
      'instructions', v_pricing.instructions
    );
  end if;

  if v_pricing.course_id is null then
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
    'instructions', v_pricing.instructions,
    'due', v_due
  );
end;
$$;

grant execute on function public.create_course_payment_order(uuid) to authenticated;
