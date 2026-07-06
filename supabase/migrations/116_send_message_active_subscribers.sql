-- Admin: send one personal NTH Team message to every aspirant with an active subscription.
-- Runs entirely in Postgres so delivery does not depend on the browser staying open.

create or replace function public.send_message_to_active_subscribers(p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
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
    select a.id as aspirant_id
    from public.aspirants a
    where a.plan is not null
      and public.is_subscription_active(a.plan, a.plan_started_at)
  loop
    insert into public.messages (from_admin_id, to_aspirant_id, job_id, body)
    values (auth.uid(), r.aspirant_id, null, trim(p_body));
    v_recipient_count := v_recipient_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'recipient_count', v_recipient_count);
end;
$$;

comment on function public.send_message_to_active_subscribers(text) is
  'Admin only: personal NTH Team message to each aspirant with an active Base/Silver/Gold subscription.';

grant execute on function public.send_message_to_active_subscribers(text) to authenticated;
