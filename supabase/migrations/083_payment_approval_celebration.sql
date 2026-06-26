-- On payment approval: notify aspirant via Messages + enable Realtime on payment_orders.

-- 1) Realtime for payment status updates (aspirant dashboard celebration)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payment_orders'
  ) then
    alter publication supabase_realtime add table public.payment_orders;
  end if;
end $$;

-- 2) Approve flow: activate plan + send congratulatory message
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
  v_plan_label text;
  v_message_body text;
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

  v_plan_label := initcap(v_row.plan);
  v_message_body := format(
    E'Congratulations! Your %s plan payment has been verified and your subscription is now active.\n\nYou can book mock interviews and apply to jobs from your dashboard. We''re excited to support your journey!\n\n— Naveen Talent Hub Team',
    v_plan_label
  );

  insert into public.messages (from_admin_id, to_aspirant_id, subject, body)
  values (auth.uid(), v_row.aspirant_id, 'Plan activated', v_message_body);

  return jsonb_build_object('ok', true, 'status', 'approved', 'plan', v_row.plan);
end;
$$;

comment on function public.admin_review_payment_order(uuid, text, text) is
  'Admin: approve (activates plan + notifies aspirant) or reject.';
