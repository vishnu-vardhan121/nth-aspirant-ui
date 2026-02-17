-- Aspirant can reply to chats. Daily limit: Base 1, Silver 3, Gold 5 messages per day.
-- Run after 014 (messages), 006 (aspirants plan).

alter table public.messages
  add column if not exists from_aspirant_id uuid references auth.users(id) on delete cascade;

comment on column public.messages.from_aspirant_id is 'When set, message is from aspirant (reply to NTH Team or job group).';

-- Aspirant can select own sent messages too
drop policy if exists "messages_aspirant_select" on public.messages;
create policy "messages_aspirant_select"
  on public.messages for select
  using (
    auth.uid() = to_aspirant_id
    or (to_aspirant_id is null and from_admin_id is not null)
    or from_aspirant_id = auth.uid()
  );

-- Aspirant can insert only their own reply (via RPC that enforces daily limit)
drop policy if exists "messages_aspirant_insert" on public.messages;
create policy "messages_aspirant_insert"
  on public.messages for insert
  with check (from_aspirant_id = auth.uid() and from_admin_id is null and batch_id is null);

-- Daily message limit by plan (replies per day)
create or replace function public.get_daily_message_limit(plan_name text)
returns int
language sql
immutable
as $$
  select case plan_name
    when 'base' then 1
    when 'silver' then 3
    when 'gold' then 5
    else 0
  end;
$$;

-- How many replies the aspirant sent today
create or replace function public.get_aspirant_daily_message_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_limit int;
  v_used int;
  v_active boolean;
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'limit', 0, 'active', false);
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a where a.id = v_uid;

  v_active := (v_plan is not null and public.is_subscription_active(v_plan, v_started_at));
  v_limit := public.get_daily_message_limit(v_plan);
  if v_limit is null then
    v_limit := 0;
  end if;

  select count(*) into v_used
  from public.messages
  where from_aspirant_id = v_uid
    and created_at >= date_trunc('day', now());

  return jsonb_build_object('used', v_used, 'limit', v_limit, 'active', v_active);
end;
$$;

-- Aspirant sends a reply (enforces daily limit and active subscription)
create or replace function public.send_aspirant_reply(p_body text, p_job_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_limit int;
  v_used int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_body is null or trim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'Message body required');
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a where a.id = v_uid;

  if v_plan is null or not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'No active subscription. Choose a plan to message.');
  end if;

  v_limit := public.get_daily_message_limit(v_plan);
  if v_limit is null or v_limit < 0 then
    v_limit := 0;
  end if;

  select count(*) into v_used
  from public.messages
  where from_aspirant_id = v_uid
    and created_at >= date_trunc('day', now());

  if v_used >= v_limit then
    return jsonb_build_object('ok', false, 'error', 'Daily message limit reached (' || v_limit || ' per day). Try again tomorrow.');
  end if;

  insert into public.messages (from_aspirant_id, job_id, body)
  values (v_uid, p_job_id, trim(p_body));

  return jsonb_build_object('ok', true, 'used', v_used + 1, 'limit', v_limit);
end;
$$;

-- get_my_messages: include aspirant's own replies and add from_me; order by created_at asc for thread
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

-- Admin: drive thread includes aspirant replies (chronological)
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
      'aspirant_name', aspirant_name
    ) order by created_at desc
  ), '[]'::jsonb) into v_rows
  from (
    select m.batch_id, max(m.body) as body, max(m.created_at) as created_at,
           count(*)::int as recipient_count, null::uuid as from_aspirant_id, null::text as aspirant_name
    from public.messages m
    where m.job_id = p_job_id and m.batch_id is not null
    group by m.batch_id
    union all
    select m.id, m.body, m.created_at, null::int, m.from_aspirant_id, a.full_name
    from public.messages m
    left join public.aspirants a on a.id = m.from_aspirant_id
    where m.job_id = p_job_id and m.from_aspirant_id is not null
  ) t;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- Admin: individual thread includes aspirant replies
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
      'from_aspirant', from_aspirant_id is not null
    ) order by created_at asc
  ), '[]'::jsonb) into v_rows
  from public.messages
  where to_aspirant_id = p_aspirant_id or from_aspirant_id = p_aspirant_id;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
