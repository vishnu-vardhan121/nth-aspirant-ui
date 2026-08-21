-- G2: Per-course Golden pricing (3 packs) + separate course UPI.

create table if not exists public.course_pricing (
  course_id uuid primary key references public.courses(id) on delete cascade,
  full_amount_inr int not null,
  two_amounts_inr int[] not null,
  three_amounts_inr int[] not null,
  upi_id text not null,
  upi_payee_name text not null,
  instructions text,
  updated_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_pricing_full_positive check (full_amount_inr > 0),
  constraint course_pricing_two_len check (cardinality(two_amounts_inr) = 2),
  constraint course_pricing_three_len check (cardinality(three_amounts_inr) = 3),
  constraint course_pricing_two_positive check (
    two_amounts_inr[1] > 0 and two_amounts_inr[2] > 0
  ),
  constraint course_pricing_three_positive check (
    three_amounts_inr[1] > 0 and three_amounts_inr[2] > 0 and three_amounts_inr[3] > 0
  ),
  constraint course_pricing_upi_nonempty check (char_length(trim(upi_id)) >= 3),
  constraint course_pricing_payee_nonempty check (char_length(trim(upi_payee_name)) >= 2)
);

drop trigger if exists course_pricing_updated_at on public.course_pricing;
create trigger course_pricing_updated_at
  before update on public.course_pricing
  for each row execute function public.set_updated_at();

alter table public.course_pricing enable row level security;

drop policy if exists "course_pricing_ops_all" on public.course_pricing;
create policy "course_pricing_ops_all"
  on public.course_pricing for all to authenticated
  using (public.is_ops_admin())
  with check (public.is_ops_admin());

-- No direct aspirant SELECT; use get_my_course_pricing RPC

create or replace function public.admin_get_course_pricing(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.course_pricing%rowtype;
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;
  if not exists (select 1 from public.courses where id = p_course_id) then
    return jsonb_build_object('ok', false, 'error', 'Course not found');
  end if;

  select * into v_row from public.course_pricing where course_id = p_course_id;
  if not found then
    return jsonb_build_object('ok', true, 'pricing', null);
  end if;

  return jsonb_build_object(
    'ok', true,
    'pricing', jsonb_build_object(
      'course_id', v_row.course_id,
      'full_amount_inr', v_row.full_amount_inr,
      'two_amounts_inr', to_jsonb(v_row.two_amounts_inr),
      'three_amounts_inr', to_jsonb(v_row.three_amounts_inr),
      'upi_id', v_row.upi_id,
      'upi_payee_name', v_row.upi_payee_name,
      'instructions', v_row.instructions,
      'updated_at', v_row.updated_at
    )
  );
end;
$$;

create or replace function public.admin_upsert_course_pricing(
  p_course_id uuid,
  p_full_amount_inr int,
  p_two_amounts_inr int[],
  p_three_amounts_inr int[],
  p_upi_id text,
  p_upi_payee_name text,
  p_instructions text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.course_pricing%rowtype;
  v_upi text := trim(coalesce(p_upi_id, ''));
  v_payee text := trim(coalesce(p_upi_payee_name, ''));
  v_instr text := nullif(trim(coalesce(p_instructions, '')), '');
begin
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;
  if not exists (select 1 from public.courses where id = p_course_id) then
    return jsonb_build_object('ok', false, 'error', 'Course not found');
  end if;
  if p_full_amount_inr is null or p_full_amount_inr <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Full amount must be a positive integer (INR)');
  end if;
  if p_two_amounts_inr is null or cardinality(p_two_amounts_inr) <> 2
     or p_two_amounts_inr[1] <= 0 or p_two_amounts_inr[2] <= 0 then
    return jsonb_build_object('ok', false, 'error', '2× pack needs two positive amounts');
  end if;
  if p_three_amounts_inr is null or cardinality(p_three_amounts_inr) <> 3
     or p_three_amounts_inr[1] <= 0 or p_three_amounts_inr[2] <= 0 or p_three_amounts_inr[3] <= 0 then
    return jsonb_build_object('ok', false, 'error', '3× pack needs three positive amounts');
  end if;
  if char_length(v_upi) < 3 then
    return jsonb_build_object('ok', false, 'error', 'Course UPI ID is required');
  end if;
  if char_length(v_payee) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Payee name is required');
  end if;
  if v_instr is not null and char_length(v_instr) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'Instructions max 2000 characters');
  end if;

  insert into public.course_pricing (
    course_id,
    full_amount_inr,
    two_amounts_inr,
    three_amounts_inr,
    upi_id,
    upi_payee_name,
    instructions,
    updated_by
  )
  values (
    p_course_id,
    p_full_amount_inr,
    p_two_amounts_inr,
    p_three_amounts_inr,
    v_upi,
    v_payee,
    v_instr,
    auth.uid()
  )
  on conflict (course_id) do update set
    full_amount_inr = excluded.full_amount_inr,
    two_amounts_inr = excluded.two_amounts_inr,
    three_amounts_inr = excluded.three_amounts_inr,
    upi_id = excluded.upi_id,
    upi_payee_name = excluded.upi_payee_name,
    instructions = excluded.instructions,
    updated_by = auth.uid(),
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'pricing', jsonb_build_object(
      'course_id', v_row.course_id,
      'full_amount_inr', v_row.full_amount_inr,
      'two_amounts_inr', to_jsonb(v_row.two_amounts_inr),
      'three_amounts_inr', to_jsonb(v_row.three_amounts_inr),
      'upi_id', v_row.upi_id,
      'upi_payee_name', v_row.upi_payee_name,
      'instructions', v_row.instructions,
      'updated_at', v_row.updated_at
    )
  );
end;
$$;

-- Aspirant (golden awaiting/active/paused/completed): see pack amounts (no UPI until G3 pay step — still return for preview)
create or replace function public.get_my_course_pricing(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.course_members%rowtype;
  v_row public.course_pricing%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'course_id required');
  end if;

  select * into v_member
  from public.course_members
  where course_id = p_course_id
    and aspirant_id = v_uid
    and status = 'golden'
    and access_state in ('awaiting_payment', 'active', 'paused', 'completed');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Golden pricing not available for your membership');
  end if;

  select * into v_row from public.course_pricing where course_id = p_course_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pricing not set yet. Please wait for admin.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'pricing', jsonb_build_object(
      'course_id', v_row.course_id,
      'full_amount_inr', v_row.full_amount_inr,
      'two_amounts_inr', to_jsonb(v_row.two_amounts_inr),
      'three_amounts_inr', to_jsonb(v_row.three_amounts_inr),
      -- UPI exposed only when they can pay (G3 will use this); safe for awaiting_payment preview
      'upi_id', case
        when v_member.access_state in ('awaiting_payment', 'paused', 'active') then v_row.upi_id
        else null
      end,
      'upi_payee_name', case
        when v_member.access_state in ('awaiting_payment', 'paused', 'active') then v_row.upi_payee_name
        else null
      end,
      'instructions', v_row.instructions,
      'gap_months', 1
    ),
    'access_state', v_member.access_state,
    'chosen_pack', v_member.chosen_pack
  );
end;
$$;

grant execute on function public.admin_get_course_pricing(uuid) to authenticated;
grant execute on function public.admin_upsert_course_pricing(uuid, int, int[], int[], text, text, text) to authenticated;
grant execute on function public.get_my_course_pricing(uuid) to authenticated;
