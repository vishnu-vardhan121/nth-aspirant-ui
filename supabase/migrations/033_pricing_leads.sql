-- Pricing leads: minimal info when user clicks a plan (no sign up).
-- Standalone table, no link to any pricing table. Anon can submit via RPC; only admins can read.

create table if not exists public.pricing_leads (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  track text not null check (track in ('fresher', 'experienced')),
  email text not null,
  contact_number text not null,
  graduation_pass text,
  current_company text,
  experience_years text,
  current_ctc text,
  message text,
  created_at timestamptz not null default now()
);

comment on table public.pricing_leads is 'Leads from pricing page when user selects a plan (no auth).';
comment on column public.pricing_leads.message is 'Optional message from the user.';

alter table public.pricing_leads enable row level security;

create policy "pricing_leads_admin_select"
  on public.pricing_leads for select
  using (public.is_admin());

-- RPC: submit lead (anon allowed)
create or replace function public.submit_pricing_lead(
  p_plan_id text,
  p_track text,
  p_email text,
  p_contact_number text,
  p_graduation_pass text default null,
  p_current_company text default null,
  p_experience_years text default null,
  p_current_ctc text default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_plan_id is null or p_track is null or p_email is null or trim(p_email) = '' or p_contact_number is null or trim(p_contact_number) = '' then
    return jsonb_build_object('ok', false, 'error', 'Plan, track, email and contact number are required.');
  end if;
  if p_track not in ('fresher', 'experienced') then
    return jsonb_build_object('ok', false, 'error', 'Invalid track.');
  end if;

  insert into public.pricing_leads (
    plan_id, track, email, contact_number, graduation_pass,
    current_company, experience_years, current_ctc, message
  ) values (
    trim(p_plan_id), p_track, trim(p_email), trim(p_contact_number), nullif(trim(p_graduation_pass), ''),
    nullif(trim(p_current_company), ''), nullif(trim(p_experience_years), ''), nullif(trim(p_current_ctc), ''),
    nullif(trim(p_message), '')
  );
  return jsonb_build_object('ok', true);
end;
$$;

-- RPC: admin list leads
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
      'email', email,
      'contact_number', contact_number,
      'graduation_pass', graduation_pass,
      'current_company', current_company,
      'experience_years', experience_years,
      'current_ctc', current_ctc,
      'message', message,
      'created_at', created_at
    ) order by created_at desc
  ), '[]'::jsonb) into v_rows
  from public.pricing_leads;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
