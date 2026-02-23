-- Admin can set or update an aspirant's plan and plan_started_at (e.g. after offline payment or upgrade).

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

comment on function public.admin_set_aspirant_plan(uuid, text, timestamptz) is 'Admin only: set aspirant plan and optionally plan_started_at.';
