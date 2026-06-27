-- Lightweight save for post-login contact popup (name + mobile only; no domain/onboarding validation).

create or replace function public.save_aspirant_contact_details(
  p_full_name text,
  p_phone text,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_row public.aspirants%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if exists (select 1 from public.admins where id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'Staff accounts use the admin panel, not aspirant profile');
  end if;
  if nullif(trim(coalesce(p_full_name, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Full name is required');
  end if;
  if nullif(trim(coalesce(p_phone, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Mobile number is required');
  end if;

  select coalesce(
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(u.email), ''),
    ''
  )
  into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email is null or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'Email is required');
  end if;

  insert into public.aspirants (id, full_name, email, phone, city, education)
  values (v_uid, trim(p_full_name), v_email, trim(p_phone), '—', '{}'::jsonb)
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = coalesce(nullif(trim(public.aspirants.email), ''), excluded.email)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'profile', to_jsonb(v_row));
end;
$$;

comment on function public.save_aspirant_contact_details(text, text, text) is
  'Post-login contact popup: save name and mobile only; skips onboarding/domain validation.';

grant execute on function public.save_aspirant_contact_details(text, text, text) to authenticated;
