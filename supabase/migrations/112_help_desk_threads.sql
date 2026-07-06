-- Help desk threaded conversations: users (by login or matching email) and admins can reply.

alter table public.help_requests
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists last_message_at timestamptz,
  add column if not exists user_last_read_at timestamptz,
  add column if not exists admin_last_read_at timestamptz;

create index if not exists help_requests_user_id_idx on public.help_requests(user_id);
create index if not exists help_requests_email_lower_idx on public.help_requests(lower(email));
create index if not exists help_requests_last_message_at_idx on public.help_requests(last_message_at desc nulls last);

create table if not exists public.help_request_messages (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null references public.help_requests(id) on delete cascade,
  sender_role text not null,
  from_user_id uuid references auth.users(id) on delete set null,
  from_admin_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint help_request_messages_sender_role_check
    check (sender_role in ('user', 'admin')),
  constraint help_request_messages_body_len_check
    check (char_length(trim(body)) between 1 and 2000)
);

create index if not exists help_request_messages_request_created_idx
  on public.help_request_messages(help_request_id, created_at asc);

alter table public.help_request_messages enable row level security;

drop policy if exists "help_request_messages_admin_all" on public.help_request_messages;
create policy "help_request_messages_admin_all"
  on public.help_request_messages
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Backfill opening message from legacy help_requests.message column.
insert into public.help_request_messages (help_request_id, sender_role, from_user_id, body, created_at)
select
  hr.id,
  'user',
  hr.user_id,
  hr.message,
  hr.created_at
from public.help_requests hr
where not exists (
  select 1 from public.help_request_messages m where m.help_request_id = hr.id
);

update public.help_requests hr
set last_message_at = coalesce(
  (select max(m.created_at) from public.help_request_messages m where m.help_request_id = hr.id),
  hr.created_at
)
where hr.last_message_at is null;

create or replace function public.current_auth_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.can_access_help_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.help_requests hr
    where hr.id = p_request_id
      and (
        public.is_admin()
        or (
          auth.uid() is not null
          and (
            hr.user_id = auth.uid()
            or (
              public.current_auth_email() <> ''
              and lower(hr.email) = public.current_auth_email()
            )
          )
        )
      )
  );
$$;

-- Help-desk-only block list (separate from account bans).
create table if not exists public.help_desk_blocked (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  phone text,
  reason text,
  blocked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists help_desk_blocked_user_id_idx on public.help_desk_blocked(user_id);

alter table public.help_desk_blocked enable row level security;

drop policy if exists "help_desk_blocked_admin_all" on public.help_desk_blocked;
create policy "help_desk_blocked_admin_all"
  on public.help_desk_blocked
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.is_help_desk_blocked(
  p_email text default null,
  p_user_id uuid default null,
  p_phone text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.help_desk_blocked b
    where (p_user_id is not null and b.user_id = p_user_id)
      or (
        coalesce(trim(p_email), '') <> ''
        and lower(b.email) = lower(trim(p_email))
      )
      or (
        coalesce(trim(p_phone), '') <> ''
        and b.phone is not null
        and b.phone = trim(p_phone)
      )
  );
$$;

create or replace function public.get_my_help_desk_access()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.current_auth_email();
  v_blocked boolean := false;
  v_reason text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', true, 'blocked', false);
  end if;

  v_blocked := public.is_help_desk_blocked(v_email, auth.uid(), null);

  if v_blocked then
    select b.reason
    into v_reason
    from public.help_desk_blocked b
    where b.user_id = auth.uid()
       or lower(b.email) = v_email
    order by b.created_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'ok', true,
    'blocked', v_blocked,
    'reason', v_reason,
    'unread_total', (
      select coalesce(count(*)::int, 0)
      from public.help_requests hr
      join public.help_request_messages m on m.help_request_id = hr.id
      where auth.uid() is not null
        and m.sender_role = 'admin'
        and (
          hr.user_id = auth.uid()
          or (public.current_auth_email() <> '' and lower(hr.email) = public.current_auth_email())
        )
        and (hr.user_last_read_at is null or m.created_at > hr.user_last_read_at)
    )
  );
end;
$$;

grant execute on function public.get_my_help_desk_access() to authenticated;

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
  v_user_id uuid := auth.uid();
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
    name, phone, email, issue_type, message, source, user_id, last_message_at
  ) values (
    v_name, v_phone, v_email, v_issue_type, v_message, v_source, v_user_id, now()
  )
  returning id into v_id;

  insert into public.help_request_messages (
    help_request_id, sender_role, from_user_id, body
  ) values (
    v_id, 'user', v_user_id, v_message
  );

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to submit help request.'));
end;
$$;

create or replace function public.get_my_help_requests()
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  issue_type text,
  message text,
  source text,
  status text,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  user_id uuid,
  last_message_at timestamptz,
  last_preview text,
  unread_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    hr.id,
    hr.name,
    hr.phone,
    hr.email,
    hr.issue_type,
    hr.message,
    hr.source,
    hr.status,
    hr.admin_notes,
    hr.created_at,
    hr.updated_at,
    hr.resolved_at,
    hr.user_id,
    coalesce(hr.last_message_at, hr.created_at) as last_message_at,
    (
      select left(replace(trim(m.body), E'\n', ' '), 120)
      from public.help_request_messages m
      where m.help_request_id = hr.id
      order by m.created_at desc
      limit 1
    ) as last_preview,
    (
      select count(*)::bigint
      from public.help_request_messages m
      where m.help_request_id = hr.id
        and m.sender_role = 'admin'
        and (
          hr.user_last_read_at is null
          or m.created_at > hr.user_last_read_at
        )
    ) as unread_count
  from public.help_requests hr
  where auth.uid() is not null
    and (
      hr.user_id = auth.uid()
      or (
        public.current_auth_email() <> ''
        and lower(hr.email) = public.current_auth_email()
      )
    )
  order by coalesce(hr.last_message_at, hr.created_at) desc;
$$;

grant execute on function public.get_my_help_requests() to authenticated;

create or replace function public.get_help_request_thread(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.help_requests%rowtype;
  v_messages jsonb;
  v_can_reply boolean := true;
  v_reply_reason text := null;
  v_requester_blocked boolean := false;
begin
  if p_request_id is null then
    return jsonb_build_object('ok', false, 'error', 'Request id is required.');
  end if;

  if not public.can_access_help_request(p_request_id) then
    return jsonb_build_object('ok', false, 'error', 'Not allowed.');
  end if;

  select * into v_request
  from public.help_requests
  where id = p_request_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found.');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'sender_role', m.sender_role,
        'body', m.body,
        'created_at', m.created_at,
        'from_me',
          case
            when public.is_admin() then m.sender_role = 'admin'
            else m.sender_role = 'user'
          end
      )
      order by m.created_at asc
    ),
    '[]'::jsonb
  )
  into v_messages
  from public.help_request_messages m
  where m.help_request_id = p_request_id;

  v_requester_blocked := public.is_help_desk_blocked(v_request.email, v_request.user_id, v_request.phone);

  if v_request.status = 'resolved' then
    v_can_reply := false;
    v_reply_reason := case
      when public.is_admin() then 'Ticket is closed. Set status to In progress to reply.'
      else 'This ticket is closed. Start a new ticket if you still need help.'
    end;
  end if;

  if public.is_admin() then
    update public.help_requests
    set admin_last_read_at = now()
    where id = p_request_id;
  else
    update public.help_requests
    set user_last_read_at = now()
    where id = p_request_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'request', to_jsonb(v_request),
    'messages', v_messages,
    'can_reply', v_can_reply,
    'reply_disabled_reason', v_reply_reason,
    'requester_blocked', v_requester_blocked
  );
end;
$$;

grant execute on function public.get_help_request_thread(uuid) to authenticated;

create or replace function public.reply_to_help_request(
  p_request_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_is_admin boolean := public.is_admin();
  v_status text;
begin
  if p_request_id is null then
    return jsonb_build_object('ok', false, 'error', 'Request id is required.');
  end if;

  if not public.can_access_help_request(p_request_id) then
    return jsonb_build_object('ok', false, 'error', 'Not allowed.');
  end if;

  if char_length(v_body) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Message cannot be empty.');
  end if;

  if char_length(v_body) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'Message is too long (max 2000 characters).');
  end if;

  select status into v_status from public.help_requests where id = p_request_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found.');
  end if;

  if v_status = 'resolved' then
    return jsonb_build_object('ok', false, 'error', 'This ticket is closed.');
  end if;

  if v_is_admin then
    insert into public.help_request_messages (
      help_request_id, sender_role, from_admin_id, body
    ) values (
      p_request_id, 'admin', auth.uid(), v_body
    );

    update public.help_requests
    set
      last_message_at = now(),
      status = case when status = 'open' then 'in_progress' else status end,
      admin_last_read_at = now()
    where id = p_request_id;
  else
    insert into public.help_request_messages (
      help_request_id, sender_role, from_user_id, body
    ) values (
      p_request_id, 'user', auth.uid(), v_body
    );

    update public.help_requests
    set
      last_message_at = now(),
      user_last_read_at = now(),
      user_id = coalesce(user_id, auth.uid())
    where id = p_request_id;
  end if;

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to send reply.'));
end;
$$;

grant execute on function public.reply_to_help_request(uuid, text) to authenticated;

drop function if exists public.get_admin_help_requests(text, text);
drop function if exists public.get_admin_help_requests(text, text, text);

create or replace function public.get_admin_help_requests(
  p_status text default null,
  p_search text default null,
  p_inbox text default 'main'
)
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  issue_type text,
  message text,
  source text,
  status text,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  user_id uuid,
  last_message_at timestamptz,
  user_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  last_preview text,
  unread_count bigint,
  requester_blocked boolean
)
language sql
security definer
set search_path = public
as $$
  select
    hr.id,
    hr.name,
    hr.phone,
    hr.email,
    hr.issue_type,
    hr.message,
    hr.source,
    hr.status,
    hr.admin_notes,
    hr.created_at,
    hr.updated_at,
    hr.resolved_at,
    hr.user_id,
    coalesce(hr.last_message_at, hr.created_at) as last_message_at,
    hr.user_last_read_at,
    hr.admin_last_read_at,
    (
      select left(replace(trim(m.body), E'\n', ' '), 120)
      from public.help_request_messages m
      where m.help_request_id = hr.id
      order by m.created_at desc
      limit 1
    ) as last_preview,
    (
      select count(*)::bigint
      from public.help_request_messages m
      where m.help_request_id = hr.id
        and m.sender_role = 'user'
        and (
          hr.admin_last_read_at is null
          or m.created_at > hr.admin_last_read_at
        )
    ) as unread_count,
    public.is_help_desk_blocked(hr.email, hr.user_id, hr.phone) as requester_blocked
  from public.help_requests hr
  where public.is_admin()
    and (
      coalesce(trim(p_inbox), 'main') = 'all'
      or (
        coalesce(trim(p_inbox), 'main') = 'main'
        and not public.is_help_desk_blocked(hr.email, hr.user_id, hr.phone)
      )
      or (
        trim(p_inbox) = 'blocked'
        and public.is_help_desk_blocked(hr.email, hr.user_id, hr.phone)
      )
    )
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
  order by coalesce(hr.last_message_at, hr.created_at) desc;
$$;

grant execute on function public.get_admin_help_requests(text, text, text) to authenticated;

create or replace function public.get_admin_help_desk_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_main_unread bigint := 0;
  v_blocked_unread bigint := 0;
  v_main_open bigint := 0;
  v_blocked_open bigint := 0;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed.');
  end if;

  select
    coalesce(sum(case when not public.is_help_desk_blocked(hr.email, hr.user_id, hr.phone) then unread else 0 end), 0),
    coalesce(sum(case when public.is_help_desk_blocked(hr.email, hr.user_id, hr.phone) then unread else 0 end), 0),
    coalesce(count(*) filter (where not public.is_help_desk_blocked(hr.email, hr.user_id, hr.phone) and hr.status <> 'resolved'), 0),
    coalesce(count(*) filter (where public.is_help_desk_blocked(hr.email, hr.user_id, hr.phone) and hr.status <> 'resolved'), 0)
  into v_main_unread, v_blocked_unread, v_main_open, v_blocked_open
  from (
    select
      hr.*,
      (
        select count(*)::bigint
        from public.help_request_messages m
        where m.help_request_id = hr.id
          and m.sender_role = 'user'
          and (hr.admin_last_read_at is null or m.created_at > hr.admin_last_read_at)
      ) as unread
    from public.help_requests hr
  ) hr;

  return jsonb_build_object(
    'ok', true,
    'main_unread', v_main_unread,
    'blocked_unread', v_blocked_unread,
    'main_open', v_main_open,
    'blocked_open', v_blocked_open
  );
end;
$$;

grant execute on function public.get_admin_help_desk_summary() to authenticated;

create or replace function public.get_help_desk_blocked_list()
returns setof public.help_desk_blocked
language sql
security definer
set search_path = public
as $$
  select b.*
  from public.help_desk_blocked b
  where public.is_admin()
  order by b.created_at desc;
$$;

grant execute on function public.get_help_desk_blocked_list() to authenticated;

create or replace function public.block_help_desk_user(
  p_email text,
  p_user_id uuid default null,
  p_phone text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed.');
  end if;

  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Valid email is required.');
  end if;

  insert into public.help_desk_blocked (email, user_id, phone, reason, blocked_by)
  values (v_email, p_user_id, v_phone, v_reason, auth.uid())
  on conflict (email) do update set
    user_id = coalesce(excluded.user_id, public.help_desk_blocked.user_id),
    phone = coalesce(excluded.phone, public.help_desk_blocked.phone),
    reason = coalesce(excluded.reason, public.help_desk_blocked.reason),
    blocked_by = auth.uid();

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to block user.'));
end;
$$;

grant execute on function public.block_help_desk_user(text, uuid, text, text) to authenticated;

create or replace function public.unblock_help_desk_user(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_count int := 0;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed.');
  end if;

  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'Email is required.');
  end if;

  delete from public.help_desk_blocked where email = v_email;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'No block entry found for this email.');
  end if;

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', coalesce(sqlerrm, 'Failed to unblock user.'));
end;
$$;

grant execute on function public.unblock_help_desk_user(text) to authenticated;
