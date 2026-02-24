-- Lead status and admin notes for pricing_leads (no payment flow: contact → convert).

alter table public.pricing_leads
  add column if not exists status text not null default 'new',
  add column if not exists admin_notes text;

comment on column public.pricing_leads.status is 'new | contacted | converted | rejected';
comment on column public.pricing_leads.admin_notes is 'Admin notes (e.g. payment received, follow-up).';

-- Allow admins to update status and admin_notes.
create policy "pricing_leads_admin_update"
  on public.pricing_leads for update
  using (public.is_admin())
  with check (public.is_admin());

-- RPC: admin updates lead status and/or notes.
create or replace function public.update_pricing_lead_status(
  p_lead_id uuid,
  p_status text default null,
  p_admin_notes text default null
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
  if p_lead_id is null then
    return jsonb_build_object('ok', false, 'error', 'lead_id required');
  end if;

  update public.pricing_leads
  set
    status = case
      when p_status is not null and trim(p_status) != '' and trim(p_status) in ('new', 'contacted', 'converted', 'rejected')
      then trim(p_status) else status end,
    admin_notes = case when p_admin_notes is not null then p_admin_notes else admin_notes end
  where id = p_lead_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Lead not found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.update_pricing_lead_status(uuid, text, text) is 'Admin only: update lead status and/or admin_notes.';
