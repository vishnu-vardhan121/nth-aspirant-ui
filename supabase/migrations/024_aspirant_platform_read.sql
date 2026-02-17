-- Fix unread badge in aspirant Messages: platform messages (to_aspirant_id null) were never
-- marked read because mark_aspirant_messages_read only updates to_aspirant_id = auth.uid().
-- Track per-aspirant "read platform messages up to this time" so NTH Team chat unread clears.

create table if not exists public.aspirant_platform_read (
  aspirant_id uuid primary key references public.aspirants(id) on delete cascade,
  read_at timestamptz not null default now()
);

comment on table public.aspirant_platform_read is 'When aspirant last marked NTH Team chat as read; used to treat platform (broadcast) messages as read.';

-- Mark direct messages (to_aspirant_id = uid) as read as before; when p_job_id is null also
-- record that this aspirant has read platform messages so get_my_messages shows them as read.
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

  if p_job_id is null then
    insert into public.aspirant_platform_read (aspirant_id, read_at)
    values (auth.uid(), now())
    on conflict (aspirant_id) do update set read_at = now();
  end if;
end;
$$;

-- For platform messages (to_aspirant_id null), treat as read if aspirant has marked NTH Team read
-- at or after the message created_at; otherwise use messages.read_at for direct messages.
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
  left join public.aspirant_platform_read pr on pr.aspirant_id = v_uid
  where (m.to_aspirant_id = v_uid or (m.to_aspirant_id is null and m.from_admin_id is not null))
     or m.from_aspirant_id = v_uid;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
