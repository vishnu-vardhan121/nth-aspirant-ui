-- WhatsApp-style read/unread: read_at (aspirant read), admin_read_at (admin read aspirant replies).
-- Run after 016.

alter table public.messages
  add column if not exists read_at timestamptz,
  add column if not exists admin_read_at timestamptz;

comment on column public.messages.read_at is 'When the aspirant (to_aspirant_id) read this message.';
comment on column public.messages.admin_read_at is 'When admin read this message (used for aspirant replies).';

-- Aspirant: mark all messages in this chat as read (when they open the chat)
create or replace function public.mark_aspirant_messages_read(p_job_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
  set read_at = now()
  where to_aspirant_id = auth.uid()
    and (p_job_id is null and job_id is null or job_id = p_job_id)
    and read_at is null;
end;
$$;

-- Admin: mark aspirant replies in this thread as read (when they open the job group or individual chat)
create or replace function public.mark_admin_messages_read(p_job_id uuid default null, p_aspirant_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return;
  end if;
  if p_job_id is not null then
    update public.messages set admin_read_at = now()
    where job_id = p_job_id and from_aspirant_id is not null and admin_read_at is null;
  end if;
  if p_aspirant_id is not null then
    update public.messages set admin_read_at = now()
    where from_aspirant_id = p_aspirant_id and admin_read_at is null;
  end if;
end;
$$;

-- get_my_messages: include read_at (for received) and admin_read_at (for my sent messages)
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
      'from_me', m.from_aspirant_id = v_uid,
      'read_at', m.read_at,
      'admin_read_at', m.admin_read_at,
      'source', case
        when m.from_aspirant_id = v_uid then case when m.job_id is not null then 'job_group' else 'personal' end
        when m.batch_id is not null then 'job_group'
        when m.job_id is not null then 'job_group'
        when m.to_aspirant_id is null then 'platform'
        else 'personal'
      end
    ) order by m.created_at asc
  ) into v_rows
  from public.messages m
  left join public.jobs j on j.id = m.job_id
  where (m.to_aspirant_id = v_uid or (m.to_aspirant_id is null and m.from_admin_id is not null))
     or m.from_aspirant_id = v_uid;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- get_admin_drive_conversations: add unread_count (aspirant replies not yet read by admin)
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
      'applicant_count', coalesce(a.total, 0),
      'unread_count', coalesce(u.cnt, 0)
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
  left join (
    select job_id, count(*)::int as cnt
    from public.messages
    where from_aspirant_id is not null and admin_read_at is null
    group by job_id
  ) u on u.job_id = j.id
  where a.total > 0;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- get_aspirants_for_admin: add unread_count (replies from this aspirant not yet read by admin)
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
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'email', a.email,
        'full_name', a.full_name,
        'unread_count', coalesce(u.cnt, 0)
      ) order by a.full_name
    ), '[]'::jsonb)
    from public.aspirants a
    left join (
      select from_aspirant_id, count(*)::int as cnt
      from public.messages
      where from_aspirant_id is not null and admin_read_at is null
      group by from_aspirant_id
    ) u on u.from_aspirant_id = a.id
  );
end;
$$;

-- get_admin_drive_messages: include admin_read_at for reply rows (for showing read status)
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
      'recipient_count', recipient_count,
      'from_aspirant_id', from_aspirant_id,
      'aspirant_name', aspirant_name,
      'admin_read_at', admin_read_at
    ) order by created_at desc
  ), '[]'::jsonb) into v_rows
  from (
    select m.batch_id, max(m.body) as body, max(m.created_at) as created_at,
           count(*)::int as recipient_count, null::uuid as from_aspirant_id, null::text as aspirant_name, null::timestamptz as admin_read_at
    from public.messages m
    where m.job_id = p_job_id and m.batch_id is not null
    group by m.batch_id
    union all
    select m.id, m.body, m.created_at, null::int, m.from_aspirant_id, a.full_name, m.admin_read_at
    from public.messages m
    left join public.aspirants a on a.id = m.from_aspirant_id
    where m.job_id = p_job_id and m.from_aspirant_id is not null
  ) t;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- get_admin_messages_to_aspirant: include admin_read_at
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
      'job_id', job_id,
      'from_aspirant', from_aspirant_id is not null,
      'admin_read_at', admin_read_at
    ) order by created_at asc
  ), '[]'::jsonb) into v_rows
  from public.messages
  where to_aspirant_id = p_aspirant_id or from_aspirant_id = p_aspirant_id;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
