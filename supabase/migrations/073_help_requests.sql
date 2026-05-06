-- Landing page help desk submissions + admin management

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  issue_type text not null,
  message text not null,
  source text not null default 'landing_page',
  status text not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.help_requests
  drop constraint if exists help_requests_status_check;
alter table public.help_requests
  add constraint help_requests_status_check
  check (status in ('open', 'in_progress', 'resolved'));

alter table public.help_requests
  drop constraint if exists help_requests_issue_type_check;
alter table public.help_requests
  add constraint help_requests_issue_type_check
  check (issue_type in ('general', 'account', 'technical', 'jobs', 'mocks', 'payment', 'ads', 'other'));

create index if not exists help_requests_created_at_idx on public.help_requests(created_at desc);
create index if not exists help_requests_status_idx on public.help_requests(status);

create or replace function public.set_help_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_help_requests_updated_at on public.help_requests;
create trigger trg_help_requests_updated_at
before update on public.help_requests
for each row execute function public.set_help_requests_updated_at();

alter table public.help_requests enable row level security;

drop policy if exists "help_requests_admin_select" on public.help_requests;
create policy "help_requests_admin_select"
  on public.help_requests
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "help_requests_admin_update" on public.help_requests;
create policy "help_requests_admin_update"
  on public.help_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.submit_help_request(
  p_name text,
  p_phone text,
  p_email text,
  p_issue_type text,
  p_message text,
  p_source text default 'landing_page'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_phone text := trim(coalesce(p_phone, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_issue_type text := lower(trim(coalesce(p_issue_type, '')));
  v_message text := trim(coalesce(p_message, ''));
  v_source text := lower(trim(coalesce(p_source, '')));
  v_id uuid;
begin
  if char_length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Please enter your name.');
  end if;

  if v_phone = '' then
    return jsonb_build_object('ok', false, 'error', 'Please enter your phone number.');
  end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid 10-digit Indian mobile number.');
  end if;

  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid email address.');
  end if;

  if v_issue_type not in ('general', 'account', 'technical', 'jobs', 'mocks', 'payment', 'ads', 'other') then
    return jsonb_build_object('ok', false, 'error', 'Please choose an issue type.');
  end if;

  if char_length(v_message) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Issue message should be at least 10 characters.');
  end if;

  if v_source = '' then
    v_source := 'landing_page';
  end if;

  insert into public.help_requests (
    name, phone, email, issue_type, message, source
  ) values (
    v_name, v_phone, v_email, v_issue_type, v_message, v_source
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to submit help request.'));
end;
$$;

grant execute on function public.submit_help_request(text, text, text, text, text, text) to anon, authenticated;

create or replace function public.get_admin_help_requests(
  p_status text default null,
  p_search text default null
)
returns setof public.help_requests
language sql
security definer
set search_path = public
as $$
  select hr.*
  from public.help_requests hr
  where public.is_admin()
    and (
      p_status is null
      or trim(p_status) = ''
      or hr.status = lower(trim(p_status))
    )
    and (
      p_search is null
      or trim(p_search) = ''
      or hr.name ilike '%' || trim(p_search) || '%'
      or hr.email ilike '%' || trim(p_search) || '%'
      or hr.phone ilike '%' || trim(p_search) || '%'
      or hr.message ilike '%' || trim(p_search) || '%'
    )
  order by hr.created_at desc;
$$;

grant execute on function public.get_admin_help_requests(text, text) to authenticated;

create or replace function public.update_help_request_status(
  p_request_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_status, '')));
  v_count int := 0;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed.');
  end if;

  if p_request_id is null then
    return jsonb_build_object('ok', false, 'error', 'Request id is required.');
  end if;

  if v_status not in ('open', 'in_progress', 'resolved') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status.');
  end if;

  update public.help_requests
  set
    status = v_status,
    admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
    resolved_at = case when v_status = 'resolved' then now() else null end
  where id = p_request_id;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'Request not found.');
  end if;

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to update request.'));
end;
$$;

grant execute on function public.update_help_request_status(uuid, text, text) to authenticated;
