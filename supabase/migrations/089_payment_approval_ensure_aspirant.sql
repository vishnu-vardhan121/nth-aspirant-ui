-- Ensure aspirant row exists when admin activates a plan (user may have paid before onboarding).

create or replace function public.admin_set_aspirant_plan(
  p_aspirant_id uuid,
  p_plan text,
  p_plan_started_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_aspirant_id is null then
    return jsonb_build_object('ok', false, 'error', 'aspirant_id required');
  end if;
  if p_plan is null or trim(p_plan) = '' then
    return jsonb_build_object('ok', false, 'error', 'plan required');
  end if;
  if p_plan not in ('base', 'silver', 'gold') then
    return jsonb_build_object('ok', false, 'error', 'plan must be base, silver, or gold');
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = p_aspirant_id;

  if v_email is null then
    return jsonb_build_object('ok', false, 'error', 'User not found');
  end if;

  v_name := split_part(v_email, '@', 1);

  insert into public.aspirants (id, full_name, email, city)
  values (p_aspirant_id, v_name, v_email, 'Pending')
  on conflict (id) do nothing;

  update public.aspirants
  set
    plan = trim(p_plan),
    plan_started_at = coalesce(p_plan_started_at, plan_started_at, now()),
    updated_at = now()
  where id = p_aspirant_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Aspirant not found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.admin_set_aspirant_plan(uuid, text, timestamptz) is
  'Admin only: ensure aspirant row, then set plan and plan_started_at.';
