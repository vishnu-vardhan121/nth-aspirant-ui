-- G4/G5: Installment due window, auto-pause when overdue, in-app reminder fields.
-- Pause: still golden member; Join/Play blocked (board + watch).

create or replace function public.course_ist_today()
returns date
language sql
stable
as $$
  select (timezone('Asia/Kolkata', now()))::date;
$$;

-- Sync one member: pause if past next_due_at with unpaid installments.
create or replace function public.sync_course_member_payment_access(p_member_id uuid)
returns public.course_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.course_members%rowtype;
  v_today date := public.course_ist_today();
  v_due date;
begin
  select * into v_member
  from public.course_members
  where id = p_member_id
  for update;
  if not found then
    return null;
  end if;

  if v_member.status is distinct from 'golden' then
    return v_member;
  end if;

  if v_member.access_state = 'active'
     and v_member.next_due_at is not null
     and coalesce(v_member.installments_paid, 0) < coalesce(v_member.installments_total, 0)
  then
    v_due := (timezone('Asia/Kolkata', v_member.next_due_at))::date;
    if v_today > v_due then
      update public.course_members
      set access_state = 'paused', updated_at = now()
      where id = p_member_id
      returning * into v_member;
    end if;
  end if;

  return v_member;
end;
$$;

create or replace function public.course_member_due_info(p_member public.course_members)
returns jsonb
language plpgsql
stable
as $$
declare
  v_today date := public.course_ist_today();
  v_due date;
  v_days int;
  v_remaining int;
begin
  v_remaining := greatest(
    coalesce(p_member.installments_total, 0) - coalesce(p_member.installments_paid, 0),
    0
  );

  if p_member.next_due_at is null or v_remaining <= 0 then
    return jsonb_build_object(
      'has_due', false,
      'remaining_installments', v_remaining,
      'days_until_due', null,
      'is_overdue', p_member.access_state = 'paused',
      'reminder', false,
      'can_pay_next', p_member.access_state in ('awaiting_payment', 'paused')
        or (
          p_member.access_state = 'active'
          and v_remaining > 0
        )
    );
  end if;

  v_due := (timezone('Asia/Kolkata', p_member.next_due_at))::date;
  v_days := (v_due - v_today);

  return jsonb_build_object(
    'has_due', true,
    'remaining_installments', v_remaining,
    'next_due_at', p_member.next_due_at,
    'due_date_ist', v_due,
    'days_until_due', v_days,
    'is_overdue', v_days < 0 or p_member.access_state = 'paused',
    'reminder', v_days between 0 and 7,
    'can_pay_next',
      p_member.access_state in ('awaiting_payment', 'paused')
      or (
        p_member.access_state = 'active'
        and v_remaining > 0
        and v_days <= 7
      )
  );
end;
$$;

-- Allow next installment when due window opens (≤7 days) or paused/overdue
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

  select id into v_open
  from public.course_payment_orders
  where member_id = v_member.id
    and status in ('pending', 'submitted')
  order by created_at desc
  limit 1;
  if v_open is not null then
    select * into v_order from public.course_payment_orders where id = v_open;
    return jsonb_build_object('ok', true, 'order', to_jsonb(v_order), 'existing', true, 'due', v_due);
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
    'instructions', v_pricing.instructions,
    'due', v_due
  );
end;
$$;

create or replace function public.get_my_course_payment_order(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.course_payment_orders%rowtype;
  v_pricing public.course_pricing%rowtype;
  v_member public.course_members%rowtype;
  v_due jsonb;
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

  v_member := public.sync_course_member_payment_access(v_member.id);
  v_due := public.course_member_due_info(v_member);

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
    'due', v_due,
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

-- Expose due fields on course list; sync pause for current user rows
create or replace function public.list_active_courses()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
  r record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not exists (select 1 from public.aspirants where id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'Aspirant profile required');
  end if;

  -- Sync pause for this user's golden memberships
  for r in
    select id from public.course_members
    where aspirant_id = v_uid and status = 'golden' and access_state = 'active'
  loop
    perform public.sync_course_member_payment_access(r.id);
  end loop;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      c.id,
      c.code,
      c.title,
      c.free_starts_at,
      c.free_ends_at,
      c.is_active,
      c.created_at,
      c.golden_terms_enabled,
      case
        when c.golden_terms_enabled then coalesce(c.golden_terms_bullets, '[]'::jsonb)
        else '[]'::jsonb
      end as golden_terms_bullets,
      m.id as membership_id,
      m.status as membership_status,
      m.reason as membership_reason,
      m.joined_at,
      m.reviewed_at,
      m.access_state,
      m.golden_request_reason,
      m.golden_requested_at,
      m.golden_reviewed_at,
      m.chosen_pack,
      m.installments_paid,
      m.installments_total,
      m.next_due_at,
      case
        when m.id is null then null
        else public.course_member_due_info(m)
      end as payment_due,
      exists (
        select 1
        from public.course_invites ci
        where ci.course_id = c.id
          and lower(trim(ci.email)) = public.current_aspirant_email()
      ) as is_invited
    from public.courses c
    left join public.course_members m
      on m.course_id = c.id and m.aspirant_id = v_uid
    where c.is_active = true
    order by c.created_at desc
  ) t;

  return jsonb_build_object('ok', true, 'courses', v_rows);
end;
$$;

-- Board: sync pause; hide meet links when paused
create or replace function public.list_my_course_classes_board(p_course_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_start timestamptz;
  r record;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  for r in
    select id from public.course_members
    where aspirant_id = auth.uid() and status = 'golden' and access_state = 'active'
      and (p_course_id is null or course_id = p_course_id)
  loop
    perform public.sync_course_member_payment_access(r.id);
  end loop;

  v_today_start := date_trunc('day', timezone('Asia/Kolkata', now())) at time zone 'Asia/Kolkata';

  return jsonb_build_object(
    'ok', true,
    'upcoming', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.starts_at asc)
      from (
        select
          cl.id,
          cl.course_id,
          c.title as course_title,
          cl.title,
          cl.starts_at,
          case
            when m.status = 'golden' and m.access_state = 'paused' then null
            else cl.meet_url_1
          end as meet_url_1,
          case
            when m.status = 'golden' and m.access_state = 'paused' then null
            else cl.meet_url_2
          end as meet_url_2,
          cl.covered_topics,
          (
            char_length(trim(coalesce(cl.recording_url, ''))) >= 8
            and not (
              c.recordings_locked_for_free
              and m.status in ('free', 'golden_requested', 'golden_rejected')
            )
            and not (
              m.status = 'golden' and m.access_state = 'paused'
            )
            and not (
              m.status = 'golden' and m.access_state = 'awaiting_payment' and cl.access_tier = 'golden'
            )
          ) as has_recording,
          (m.status = 'golden' and m.access_state = 'paused') as access_paused,
          (
            select jsonb_agg(jsonb_build_object(
              'id', ds.id,
              'title', ds.title,
              'starts_at', ds.starts_at,
              'meet_url', case
                when m.status = 'golden' and m.access_state = 'paused' then null
                else ds.meet_url
              end
            ) order by ds.starts_at asc)
            from public.course_doubt_sessions ds
            where ds.class_id = cl.id
          ) as class_doubt_sessions
        from public.course_classes cl
        join public.courses c on c.id = cl.course_id
        join public.course_members m
          on m.course_id = cl.course_id
         and m.aspirant_id = auth.uid()
         and public.is_course_content_member_status(m.status)
        where cl.starts_at >= v_today_start
          and (p_course_id is null or cl.course_id = p_course_id)
          and (
            cl.access_tier = 'free'
            or m.status = 'golden'
          )
        order by cl.starts_at asc
        limit 50
      ) x
    ), '[]'::jsonb),
    'completed', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.starts_at desc)
      from (
        select
          cl.id,
          cl.course_id,
          c.title as course_title,
          cl.title,
          cl.starts_at,
          cl.covered_topics,
          (
            char_length(trim(coalesce(cl.recording_url, ''))) >= 8
            and not (
              c.recordings_locked_for_free
              and m.status in ('free', 'golden_requested', 'golden_rejected')
            )
            and not (
              m.status = 'golden' and m.access_state = 'paused'
            )
            and not (
              m.status = 'golden' and m.access_state = 'awaiting_payment' and cl.access_tier = 'golden'
            )
          ) as has_recording,
          (m.status = 'golden' and m.access_state = 'paused') as access_paused,
          (select r.topics from public.course_doubt_requests r
            where r.class_id = cl.id and r.aspirant_id = auth.uid() limit 1) as my_request_topics,
          (select r.status from public.course_doubt_requests r
            where r.class_id = cl.id and r.aspirant_id = auth.uid() limit 1) as my_request_status,
          (select f.body from public.course_class_feedback f
            where f.class_id = cl.id and f.aspirant_id = auth.uid() limit 1) as my_feedback,
          (
            select jsonb_agg(jsonb_build_object(
              'id', ds.id,
              'title', ds.title,
              'starts_at', ds.starts_at,
              'meet_url', case
                when m.status = 'golden' and m.access_state = 'paused' then null
                else ds.meet_url
              end
            ) order by ds.starts_at asc)
            from public.course_doubt_sessions ds
            where ds.class_id = cl.id
          ) as class_doubt_sessions
        from public.course_classes cl
        join public.courses c on c.id = cl.course_id
        join public.course_members m
          on m.course_id = cl.course_id
         and m.aspirant_id = auth.uid()
         and public.is_course_content_member_status(m.status)
        where cl.starts_at < v_today_start
          and (p_course_id is null or cl.course_id = p_course_id)
          and (
            cl.access_tier = 'free'
            or m.status = 'golden'
          )
        order by cl.starts_at desc
        limit 100
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- Extend admin members list to return golden fields when listing all / golden
create or replace function public.admin_list_course_members(
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
      cm.id,
      cm.course_id,
      cm.aspirant_id,
      cm.status,
      cm.access_state,
      cm.reason,
      cm.joined_at,
      cm.reviewed_at,
      cm.chosen_pack,
      cm.installments_paid,
      cm.installments_total,
      cm.next_due_at,
      cm.created_at,
      a.full_name as aspirant_name,
      a.email as aspirant_email,
      a.phone as aspirant_phone
    from public.course_members cm
    join public.aspirants a on a.id = cm.aspirant_id
    where cm.course_id = p_course_id
      and (
        v_status is null
        or cm.status = v_status
        or (v_status = 'enrolled' and public.is_course_content_member_status(cm.status))
      )
    order by cm.created_at desc
    limit 500
  ) t;

  return jsonb_build_object('ok', true, 'members', v_rows);
end;
$$;

grant execute on function public.course_ist_today() to authenticated;
grant execute on function public.sync_course_member_payment_access(uuid) to authenticated;
grant execute on function public.create_course_payment_order(uuid) to authenticated;
grant execute on function public.get_my_course_payment_order(uuid) to authenticated;
grant execute on function public.list_active_courses() to authenticated;
grant execute on function public.list_my_course_classes_board(uuid) to authenticated;
grant execute on function public.admin_list_course_members(uuid, text) to authenticated;
