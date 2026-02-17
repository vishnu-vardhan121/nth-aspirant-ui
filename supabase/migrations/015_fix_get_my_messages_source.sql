-- For DBs that ran 014 before get_my_messages source fix: job group messages (batch_id set) must show as job_group, not personal.
-- 014_messages.sql now includes this logic; run this migration only if you already applied an older 014. Idempotent.
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
