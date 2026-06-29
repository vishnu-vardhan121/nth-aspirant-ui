-- Fix over-broad mark-as-read (mock notices marked read when opening NTH Team chat).
-- Add explicit mark for mock admin/system notices.

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
  -- Interviewer mock thread: only human interviewer messages to aspirant.
  if p_mock_registration_id is not null then
    update public.messages
    set read_at = now()
    where to_aspirant_id = auth.uid()
      and mock_registration_id = p_mock_registration_id
      and from_interviewer_id is not null
      and from_aspirant_id is null
      and read_at is null;
    return;
  end if;

  -- NTH Team or job group: exclude mock admin/system notices (separate chat + Mocks page).
  update public.messages
  set read_at = now()
  where to_aspirant_id = auth.uid()
    and from_aspirant_id is null
    and mock_registration_id is null
    and from_interviewer_id is null
    and (p_job_id is null and job_id is null or job_id = p_job_id)
    and read_at is null;

  -- Platform broadcast "read" cursor (NTH Team only).
  if p_job_id is null then
    insert into public.aspirant_platform_read (aspirant_id, read_at)
    values (auth.uid(), now())
    on conflict (aspirant_id) do update set read_at = now();
  end if;
end;
$$;

comment on function public.mark_aspirant_messages_read(uuid, uuid) is
  'Mark aspirant inbox read for NTH Team, job group, or interviewer mock thread. Mock admin notices are excluded until mark_my_mock_notices_read.';

-- Mark mock schedule/cancel/system notices read (Mocks page or Mock updates chat).
create or replace function public.mark_my_mock_notices_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
  set read_at = now()
  where to_aspirant_id = auth.uid()
    and mock_registration_id is not null
    and from_interviewer_id is null
    and from_aspirant_id is null
    and read_at is null;
end;
$$;

comment on function public.mark_my_mock_notices_read() is
  'Mark admin/system mock notices read (not interviewer chat messages).';

grant execute on function public.mark_my_mock_notices_read() to authenticated;

-- Reliable Realtime payloads for filtered subscriptions.
alter table public.messages replica identity full;
