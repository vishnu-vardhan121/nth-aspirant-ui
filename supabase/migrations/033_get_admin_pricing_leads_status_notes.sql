-- Include status and admin_notes in get_admin_pricing_leads (after 032).

create or replace function public.get_admin_pricing_leads()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'plan_id', plan_id,
      'track', track,
      'name', name,
      'looking_for_role', looking_for_role,
      'email', email,
      'contact_number', contact_number,
      'graduation_pass', graduation_pass,
      'current_company', current_company,
      'experience_years', experience_years,
      'current_ctc', current_ctc,
      'message', message,
      'status', status,
      'admin_notes', admin_notes,
      'created_at', created_at
    ) order by created_at desc
  ), '[]'::jsonb) into v_rows
  from public.pricing_leads;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
