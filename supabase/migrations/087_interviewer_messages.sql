-- Interviewer ↔ aspirant messaging on mock registration threads.

alter table public.messages
  add column if not exists from_interviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists to_interviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists interviewer_read_at timestamptz;

comment on column public.messages.from_interviewer_id is 'Message from interviewer to aspirant (mock thread).';
comment on column public.messages.to_interviewer_id is 'Aspirant reply to interviewer (mock thread).';
comment on column public.messages.interviewer_read_at is 'When interviewer read an aspirant reply in mock thread.';

-- Aspirants: see interviewer thread messages
drop policy if exists "messages_aspirant_select" on public.messages;
create policy "messages_aspirant_select"
  on public.messages for select
  using (
    auth.uid() = to_aspirant_id
    or (to_aspirant_id is null and from_admin_id is not null)
    or from_aspirant_id = auth.uid()
    or (to_interviewer_id is not null and from_aspirant_id = auth.uid())
  );

-- Interviewers: read mock-thread messages they participate in
drop policy if exists "messages_interviewer_select" on public.messages;
create policy "messages_interviewer_select"
  on public.messages for select
  using (
    public.is_interviewer()
    and mock_registration_id is not null
    and exists (
      select 1 from public.mock_registrations r
      where r.id = mock_registration_id and r.interviewer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Aspirant inbox: include interviewer threads
-- ---------------------------------------------------------------------------
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
      'read_at', case
        when m.to_aspirant_id is null and m.from_admin_id is not null then
          case when pr.read_at is not null and m.created_at <= pr.read_at then m.created_at else null end
        else m.read_at
      end,
      'admin_read_at', m.admin_read_at,
      'mock_registration_id', m.mock_registration_id,
      'interviewer_name', adm.name,
      'source', case
        when m.from_interviewer_id is not null or m.to_interviewer_id is not null then 'interviewer'
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
  left join public.aspirant_platform_read pr on pr.aspirant_id = v_uid
  left join public.admins adm on adm.id = coalesce(m.from_interviewer_id, m.to_interviewer_id)
  where (m.to_aspirant_id = v_uid or (m.to_aspirant_id is null and m.from_admin_id is not null))
     or m.from_aspirant_id = v_uid
     or (m.to_aspirant_id = v_uid and m.from_interviewer_id is not null);

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- Mark interviewer-thread messages read when aspirant opens chat
create or replace function public.mark_aspirant_messages_read(
  p_job_id uuid default null,
  p_mock_registration_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_mock_registration_id is not null then
    update public.messages
    set read_at = now()
    where to_aspirant_id = auth.uid()
      and mock_registration_id = p_mock_registration_id
      and from_interviewer_id is not null
      and read_at is null;
    return;
  end if;

  update public.messages
  set read_at = now()
  where to_aspirant_id = auth.uid()
    and (p_job_id is null and job_id is null or job_id = p_job_id)
    and read_at is null;

  if p_job_id is null then
    insert into public.aspirant_platform_read (aspirant_id, read_at)
    values (auth.uid(), now())
    on conflict (aspirant_id) do update set read_at = now();
  end if;
end;
$$;

-- Aspirant reply to interviewer (mock thread; no daily plan limit)
create or replace function public.send_aspirant_reply_to_interviewer(
  p_mock_registration_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_interviewer_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_mock_registration_id is null then
    return jsonb_build_object('ok', false, 'error', 'Mock registration required');
  end if;
  if p_body is null or trim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'Message body required');
  end if;

  select r.interviewer_id into v_interviewer_id
  from public.mock_registrations r
  where r.id = p_mock_registration_id and r.aspirant_id = v_uid;

  if v_interviewer_id is null then
    return jsonb_build_object('ok', false, 'error', 'Mock registration not found');
  end if;

  insert into public.messages (
    from_aspirant_id, to_interviewer_id, to_aspirant_id, mock_registration_id, body
  ) values (
    v_uid, v_interviewer_id, v_uid, p_mock_registration_id, trim(p_body)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.send_aspirant_reply_to_interviewer(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Interviewer messaging RPCs
-- ---------------------------------------------------------------------------
create or replace function public.get_interviewer_message_threads()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if not public.is_interviewer() then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(t order by t.last_at desc nulls last), '[]'::jsonb) into v_rows
  from (
    select
      r.id as mock_registration_id,
      r.aspirant_id,
      a.full_name as aspirant_name,
      a.email as aspirant_email,
      r.scheduled_at,
      r.status,
      (
        select m.body
        from public.messages m
        where m.mock_registration_id = r.id
          and (m.from_interviewer_id is not null or m.from_aspirant_id is not null)
        order by m.created_at desc
        limit 1
      ) as last_body,
      (
        select m.created_at
        from public.messages m
        where m.mock_registration_id = r.id
          and (m.from_interviewer_id is not null or m.from_aspirant_id is not null)
        order by m.created_at desc
        limit 1
      ) as last_at,
      (
        select count(*)::int
        from public.messages m
        where m.mock_registration_id = r.id
          and m.to_interviewer_id = v_uid
          and m.interviewer_read_at is null
      ) as unread_count
    from public.mock_registrations r
    join public.aspirants a on a.id = r.aspirant_id
    where r.interviewer_id = v_uid
      and r.status in ('scheduled', 'completed', 'requested')
  ) t;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

grant execute on function public.get_interviewer_message_threads() to authenticated;

create or replace function public.get_interviewer_messages(p_mock_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if not public.is_interviewer() then
    return '[]'::jsonb;
  end if;
  if p_mock_registration_id is null then
    return '[]'::jsonb;
  end if;
  if not exists (
    select 1 from public.mock_registrations r
    where r.id = p_mock_registration_id and r.interviewer_id = v_uid
  ) then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'body', m.body,
      'created_at', m.created_at,
      'from_me', m.from_interviewer_id = v_uid,
      'read_at', case when m.from_interviewer_id = v_uid then m.interviewer_read_at else m.read_at end
    ) order by m.created_at asc
  ), '[]'::jsonb) into v_rows
  from public.messages m
  where m.mock_registration_id = p_mock_registration_id
    and (m.from_interviewer_id is not null or m.from_aspirant_id is not null);

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

grant execute on function public.get_interviewer_messages(uuid) to authenticated;

create or replace function public.mark_interviewer_messages_read(p_mock_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_interviewer() or p_mock_registration_id is null then
    return;
  end if;
  if not exists (
    select 1 from public.mock_registrations r
    where r.id = p_mock_registration_id and r.interviewer_id = auth.uid()
  ) then
    return;
  end if;

  update public.messages
  set interviewer_read_at = now()
  where mock_registration_id = p_mock_registration_id
    and to_interviewer_id = auth.uid()
    and interviewer_read_at is null;
end;
$$;

grant execute on function public.mark_interviewer_messages_read(uuid) to authenticated;

create or replace function public.send_interviewer_message(
  p_mock_registration_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aspirant_id uuid;
begin
  if not public.is_interviewer() then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_mock_registration_id is null then
    return jsonb_build_object('ok', false, 'error', 'Mock registration required');
  end if;
  if p_body is null or trim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'Message body required');
  end if;

  select r.aspirant_id into v_aspirant_id
  from public.mock_registrations r
  where r.id = p_mock_registration_id and r.interviewer_id = v_uid;

  if v_aspirant_id is null then
    return jsonb_build_object('ok', false, 'error', 'Mock registration not found');
  end if;

  insert into public.messages (
    from_interviewer_id, to_aspirant_id, mock_registration_id, body
  ) values (
    v_uid, v_aspirant_id, p_mock_registration_id, trim(p_body)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.send_interviewer_message(uuid, text) to authenticated;
