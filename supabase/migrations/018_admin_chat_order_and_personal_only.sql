-- Admin: (1) Group chat messages in chronological order (oldest first, like WhatsApp).
--        (2) Individual chat shows only 1:1 messages (exclude group sends and job-group replies).

-- Drive thread: order by created_at asc so chat shows oldest first, newest at bottom
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
    ) order by created_at asc
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

-- Individual chat: only messages that are truly 1:1 (no group sends, no job-group replies)
-- Admin sent to this aspirant personally: to_aspirant_id = aspirant AND batch_id is null
-- Aspirant replied to NTH Team (personal): from_aspirant_id = aspirant AND job_id is null
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
  where (to_aspirant_id = p_aspirant_id and batch_id is null)
     or (from_aspirant_id = p_aspirant_id and job_id is null);
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- Mark only personal replies as read when admin opens individual chat (not job-group replies)
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
    where from_aspirant_id = p_aspirant_id and job_id is null and admin_read_at is null;
  end if;
end;
$$;

-- Aspirant unread count: only personal replies (job_id null), not job-group replies
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
      where from_aspirant_id is not null and job_id is null and admin_read_at is null
      group by from_aspirant_id
    ) u on u.from_aspirant_id = a.id
  );
end;
$$;
