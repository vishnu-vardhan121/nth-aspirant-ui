-- NEXA Talent Hire: company / HR hiring requirement leads (separate from aspirant pricing leads).

create table if not exists public.nexa_hiring_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text not null,
  work_email text not null,
  phone text not null,
  role_hiring_for text not null,
  number_of_openings integer,
  experience_level text,
  location_preference text,
  joining_timeline text,
  requirement_details text,
  source text not null default 'nexa_landing_page',
  status text not null default 'new',
  priority text not null default 'medium',
  assigned_to text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.nexa_hiring_leads is 'Hiring partner / company leads from NEXA Talent Hire landing page.';

alter table public.nexa_hiring_leads
  drop constraint if exists nexa_hiring_leads_status_check;
alter table public.nexa_hiring_leads
  add constraint nexa_hiring_leads_status_check
  check (status in (
    'new',
    'contacted',
    'requirement_verified',
    'profiles_shared',
    'interview_scheduled',
    'closed',
    'lost'
  ));

alter table public.nexa_hiring_leads
  drop constraint if exists nexa_hiring_leads_priority_check;
alter table public.nexa_hiring_leads
  add constraint nexa_hiring_leads_priority_check
  check (priority in ('low', 'medium', 'high', 'urgent'));

create index if not exists nexa_hiring_leads_created_at_idx on public.nexa_hiring_leads(created_at desc);
create index if not exists nexa_hiring_leads_status_idx on public.nexa_hiring_leads(status);
create index if not exists nexa_hiring_leads_priority_idx on public.nexa_hiring_leads(priority);
create index if not exists nexa_hiring_leads_company_name_idx on public.nexa_hiring_leads(company_name);

create or replace function public.set_nexa_hiring_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_nexa_hiring_leads_updated_at on public.nexa_hiring_leads;
create trigger trg_nexa_hiring_leads_updated_at
before update on public.nexa_hiring_leads
for each row execute function public.set_nexa_hiring_leads_updated_at();

alter table public.nexa_hiring_leads enable row level security;

drop policy if exists "nexa_hiring_leads_admin_select" on public.nexa_hiring_leads;
create policy "nexa_hiring_leads_admin_select"
  on public.nexa_hiring_leads
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "nexa_hiring_leads_admin_update" on public.nexa_hiring_leads;
create policy "nexa_hiring_leads_admin_update"
  on public.nexa_hiring_leads
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Public submit via RPC only (no direct insert policy for anon).

create or replace function public.submit_nexa_hiring_lead(
  p_company_name text,
  p_contact_person text,
  p_work_email text,
  p_phone text,
  p_role_hiring_for text,
  p_number_of_openings integer default null,
  p_experience_level text default null,
  p_location_preference text default null,
  p_joining_timeline text default null,
  p_requirement_details text default null,
  p_source text default 'nexa_landing_page'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company text := trim(coalesce(p_company_name, ''));
  v_contact text := trim(coalesce(p_contact_person, ''));
  v_email text := lower(trim(coalesce(p_work_email, '')));
  v_phone text := trim(coalesce(p_phone, ''));
  v_role text := trim(coalesce(p_role_hiring_for, ''));
  v_source text := trim(coalesce(p_source, ''));
  v_openings integer := p_number_of_openings;
  v_id uuid;
begin
  if char_length(v_company) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Please enter your company name.');
  end if;

  if char_length(v_contact) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Please enter your name.');
  end if;

  if v_email = '' or position('@' in v_email) = 0 or position('.' in split_part(v_email, '@', 2)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid work email.');
  end if;

  if v_phone = '' then
    return jsonb_build_object('ok', false, 'error', 'Please enter your phone number.');
  end if;
  if v_phone !~ '^[0-9+\-\s()]{10,20}$' then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid phone number.');
  end if;

  if v_role = '' then
    return jsonb_build_object('ok', false, 'error', 'Please select the role you are hiring for.');
  end if;

  if v_openings is not null and v_openings < 1 then
    return jsonb_build_object('ok', false, 'error', 'Number of openings must be at least 1.');
  end if;

  if v_source = '' then
    v_source := 'nexa_landing_page';
  end if;

  insert into public.nexa_hiring_leads (
    company_name,
    contact_person,
    work_email,
    phone,
    role_hiring_for,
    number_of_openings,
    experience_level,
    location_preference,
    joining_timeline,
    requirement_details,
    source,
    status,
    priority
  ) values (
    v_company,
    v_contact,
    v_email,
    v_phone,
    v_role,
    v_openings,
    nullif(trim(coalesce(p_experience_level, '')), ''),
    nullif(trim(coalesce(p_location_preference, '')), ''),
    nullif(trim(coalesce(p_joining_timeline, '')), ''),
    nullif(trim(coalesce(p_requirement_details, '')), ''),
    v_source,
    'new',
    'medium'
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'Unable to submit your requirement. Please try again.');
end;
$$;

grant execute on function public.submit_nexa_hiring_lead(
  text, text, text, text, text, integer, text, text, text, text, text
) to anon, authenticated;

create or replace function public.get_admin_nexa_hiring_leads(
  p_status text default null,
  p_priority text default null,
  p_search text default null
)
returns setof public.nexa_hiring_leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_status text := nullif(trim(coalesce(p_status, '')), '');
  v_priority text := nullif(trim(coalesce(p_priority, '')), '');
begin
  if not public.is_admin() then
    return;
  end if;

  return query
  select *
  from public.nexa_hiring_leads l
  where
    (v_status is null or l.status = v_status)
    and (v_priority is null or l.priority = v_priority)
    and (
      v_search is null
      or l.company_name ilike '%' || v_search || '%'
      or l.contact_person ilike '%' || v_search || '%'
      or l.work_email ilike '%' || v_search || '%'
      or l.phone ilike '%' || v_search || '%'
      or l.role_hiring_for ilike '%' || v_search || '%'
    )
  order by l.created_at desc;
end;
$$;

grant execute on function public.get_admin_nexa_hiring_leads(text, text, text) to authenticated;

create or replace function public.update_nexa_hiring_lead(
  p_lead_id uuid,
  p_status text default null,
  p_priority text default null,
  p_assigned_to text default null,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := nullif(trim(coalesce(p_status, '')), '');
  v_priority text := nullif(trim(coalesce(p_priority, '')), '');
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  if p_lead_id is null then
    return jsonb_build_object('ok', false, 'error', 'Lead id is required.');
  end if;

  if v_status is not null and v_status not in (
    'new', 'contacted', 'requirement_verified', 'profiles_shared',
    'interview_scheduled', 'closed', 'lost'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Invalid status.');
  end if;

  if v_priority is not null and v_priority not in ('low', 'medium', 'high', 'urgent') then
    return jsonb_build_object('ok', false, 'error', 'Invalid priority.');
  end if;

  update public.nexa_hiring_leads
  set
    status = coalesce(v_status, status),
    priority = coalesce(v_priority, priority),
    assigned_to = case when p_assigned_to is not null then nullif(trim(p_assigned_to), '') else assigned_to end,
    admin_notes = case when p_admin_notes is not null then p_admin_notes else admin_notes end
  where id = p_lead_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Lead not found.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.update_nexa_hiring_lead(uuid, text, text, text, text) to authenticated;
