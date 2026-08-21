-- Allow changing pack before first payment is approved; cancel open orders on change.

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
  v_cancelled int := 0;
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

  -- After first approved payment, pack is locked
  if coalesce(v_member.installments_paid, 0) > 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Pack cannot be changed after the first payment is approved'
    );
  end if;

  select * into v_pricing from public.course_pricing where course_id = p_course_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pricing not set yet');
  end if;

  v_total := case v_pack when 'full' then 1 when 'two' then 2 else 3 end;

  -- Same pack already chosen: ok (idempotent)
  if v_member.chosen_pack is not distinct from v_pack
     and v_member.installments_total is not distinct from v_total then
    return jsonb_build_object(
      'ok', true,
      'chosen_pack', v_member.chosen_pack,
      'installments_total', v_member.installments_total,
      'already_chosen', true,
      'changed', false
    );
  end if;

  -- Cancel any open orders so amount matches new pack
  update public.course_payment_orders
  set
    status = 'rejected',
    admin_notes = coalesce(admin_notes, '') ||
      case when coalesce(admin_notes, '') = '' then '' else ' | ' end ||
      'Cancelled: pack changed by aspirant',
    reviewed_at = now(),
    updated_at = now()
  where member_id = v_member.id
    and status in ('pending', 'submitted');
  get diagnostics v_cancelled = row_count;

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
    'already_chosen', false,
    'changed', true,
    'cancelled_orders', v_cancelled
  );
end;
$$;

grant execute on function public.choose_course_pack(uuid, text) to authenticated;
