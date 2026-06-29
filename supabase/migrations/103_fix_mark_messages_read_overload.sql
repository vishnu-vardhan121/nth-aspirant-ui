-- Remove legacy 1-arg overload so PostgREST always uses the correct mark-as-read logic.
-- (Old mark_aspirant_messages_read(uuid) could bypass mock-notice exclusions from 102.)

drop function if exists public.mark_aspirant_messages_read(uuid);

-- Re-assert canonical 2-arg function (same as 102).
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
      and from_aspirant_id is null
      and read_at is null;
    return;
  end if;

  update public.messages
  set read_at = now()
  where to_aspirant_id = auth.uid()
    and from_aspirant_id is null
    and mock_registration_id is null
    and from_interviewer_id is null
    and (p_job_id is null and job_id is null or job_id = p_job_id)
    and read_at is null;

  if p_job_id is null then
    insert into public.aspirant_platform_read (aspirant_id, read_at)
    values (auth.uid(), now())
    on conflict (aspirant_id) do update set read_at = now();
  end if;
end;
$$;
