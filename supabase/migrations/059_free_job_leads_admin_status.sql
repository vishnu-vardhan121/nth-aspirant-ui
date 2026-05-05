-- Admin review status for public job-page leads (aligned with applications.status).

alter table public.free_job_leads
  add column if not exists status text default 'applied';

update public.free_job_leads
set status = 'applied'
where status is null or trim(status) = '';

alter table public.free_job_leads
  alter column status set default 'applied',
  alter column status set not null;

alter table public.free_job_leads
  drop constraint if exists free_job_leads_status_check;

alter table public.free_job_leads
  add constraint free_job_leads_status_check
  check (status in ('applied', 'shortlisted', 'rejected'));

comment on column public.free_job_leads.status is
  'Admin workflow: applied (new), shortlisted, rejected.';

drop policy if exists "free_job_leads_admin_update" on public.free_job_leads;

create policy "free_job_leads_admin_update"
  on public.free_job_leads for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on policy "free_job_leads_admin_update" on public.free_job_leads is
  'Admins can update lead status (shortlist / reject).';

create or replace function public.set_free_job_lead_status(p_lead_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed.');
  end if;
  if p_lead_id is null or p_status is null or trim(p_status) = '' then
    return jsonb_build_object('ok', false, 'error', 'Missing arguments.');
  end if;
  if p_status not in ('applied', 'shortlisted', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status.');
  end if;

  update public.free_job_leads
  set status = p_status
  where id = p_lead_id;

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'Lead not found.');
  end if;

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Update failed'));
end;
$$;

comment on function public.set_free_job_lead_status(uuid, text) is
  'Admin-only: set free_job_leads.status to applied | shortlisted | rejected.';

grant execute on function public.set_free_job_lead_status(uuid, text) to authenticated;
