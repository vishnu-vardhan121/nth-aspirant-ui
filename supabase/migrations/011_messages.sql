-- Messages: admin send broadcast, to drive (shortlisted for a job), or to one aspirant. WhatsApp-style chat support.
-- Run after 005 (is_admin), 013 (applications.status).

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  from_admin_id uuid references auth.users(id) on delete set null,
  to_aspirant_id uuid references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  batch_id uuid,
  subject text,
  body text not null,
  created_at timestamptz not null default now()
);

comment on table public.messages is 'Admin messages: to_aspirant_id null = broadcast; else personal. batch_id groups drive sends (one per shortlisted).';
comment on column public.messages.batch_id is 'Same uuid for all rows in one "send to drive" batch; null for individual/broadcast.';

alter table public.messages enable row level security;

-- Aspirants: select own (to_aspirant_id = me) or broadcast (to_aspirant_id is null)
drop policy if exists "messages_aspirant_select" on public.messages;
create policy "messages_aspirant_select"
  on public.messages for select
  using (
    auth.uid() = to_aspirant_id
    or to_aspirant_id is null
  );

-- Admin: all
drop policy if exists "messages_admin_all" on public.messages;
create policy "messages_admin_all"
  on public.messages for all
  using (public.is_admin())
  with check (public.is_admin());

-- Admin: send to one aspirant (individual chat)
create or replace function public.send_message(
  p_to_aspirant_id uuid,
  p_subject text,
  p_body text,
  p_job_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_body is null or trim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'Message body required');
  end if;
  insert into public.messages (from_admin_id, to_aspirant_id, job_id, body, subject)
  values (auth.uid(), p_to_aspirant_id, p_job_id, trim(p_body), nullif(trim(coalesce(p_subject, '')), ''));
  return jsonb_build_object('ok', true);
end;
$$;

-- Admin: send common message to all shortlisted for a job (drive group). One row per shortlisted aspirant, same batch_id.
create or replace function public.send_message_to_drive(p_job_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid := gen_random_uuid();
  v_recipient_count int := 0;
  r record;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_body is null or trim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'Message body required');
  end if;
  for r in
    select a.aspirant_id
    from public.applications a
    where a.job_id = p_job_id and a.status = 'shortlisted'
  loop
    insert into public.messages (from_admin_id, to_aspirant_id, job_id, batch_id, body)
    values (auth.uid(), r.aspirant_id, p_job_id, v_batch_id, trim(p_body));
    v_recipient_count := v_recipient_count + 1;
  end loop;
  return jsonb_build_object('ok', true, 'recipient_count', v_recipient_count);
end;
$$;

-- Admin: list job groups = jobs that have at least one applicant (like WhatsApp groups per job)
create or replace function public.get_admin_drive_conversations()
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
      'job_id', j.id,
      'job_title', j.title,
      'company_name', j.company_name,
      'shortlisted_count', coalesce(s.shortlisted, 0),
      'applicant_count', coalesce(a.total, 0)
    ) order by j.title
  ), '[]'::jsonb) into v_rows
  from public.jobs j
  left join (
    select job_id, count(*)::int as shortlisted
    from public.applications where status = 'shortlisted'
    group by job_id
  ) s on s.job_id = j.id
  left join (
    select job_id, count(*)::int as total
    from public.applications
    group by job_id
  ) a on a.job_id = j.id
  where a.total > 0;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- Admin: send to all applicants for a job (broadcast for this job only). One row per applicant, same batch_id.
create or replace function public.send_message_to_job_applicants(p_job_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid := gen_random_uuid();
  v_recipient_count int := 0;
  r record;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_body is null or trim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'Message body required');
  end if;
  for r in
    select distinct a.aspirant_id
    from public.applications a
    where a.job_id = p_job_id
  loop
    insert into public.messages (from_admin_id, to_aspirant_id, job_id, batch_id, body)
    values (auth.uid(), r.aspirant_id, p_job_id, v_batch_id, trim(p_body));
    v_recipient_count := v_recipient_count + 1;
  end loop;
  return jsonb_build_object('ok', true, 'recipient_count', v_recipient_count);
end;
$$;

-- Admin: message history for a drive (grouped by batch)
create or replace function public.get_admin_drive_messages(p_job_id uuid)
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
      'batch_id', batch_id,
      'body', body,
      'created_at', created_at,
      'recipient_count', recipient_count
    ) order by created_at desc
  ), '[]'::jsonb) into v_rows
  from (
    select batch_id, max(body) as body, max(created_at) as created_at, count(*)::int as recipient_count
    from public.messages
    where job_id = p_job_id and batch_id is not null
    group by batch_id
  ) t;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- Admin: message thread to one aspirant (for individual chat panel)
create or replace function public.get_admin_messages_to_aspirant(p_aspirant_id uuid)
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
      'body', body,
      'subject', subject,
      'created_at', created_at,
      'job_id', job_id
    ) order by created_at asc
  ), '[]'::jsonb) into v_rows
  from public.messages
  where to_aspirant_id = p_aspirant_id;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- Admin: list aspirants for "To" dropdown / individual list
create or replace function public.get_aspirants_for_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'email', a.email, 'full_name', a.full_name) order by a.full_name), '[]'::jsonb)
    from public.aspirants a
  );
end;
$$;

-- Aspirant: list my messages with source so UI can differentiate (platform / job group / personal)
-- batch_id not null = job group send; job_id not null = job group; to_aspirant_id null = platform; else personal
create or replace function public.get_my_messages()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;
  select jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'subject', m.subject,
      'body', m.body,
      'created_at', m.created_at,
      'job_id', m.job_id,
      'job_title', j.title,
      'company_name', j.company_name,
      'source', case
        when m.batch_id is not null then 'job_group'
        when m.job_id is not null then 'job_group'
        when m.to_aspirant_id is null then 'platform'
        else 'personal'
      end
    ) order by m.created_at desc
  ) into v_rows
  from public.messages m
  left join public.jobs j on j.id = m.job_id
  where m.to_aspirant_id = v_uid or m.to_aspirant_id is null;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
