-- Realtime on aspirants so dashboard picks up plan activation without refresh.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'aspirants'
  ) then
    alter publication supabase_realtime add table public.aspirants;
  end if;
end $$;

-- Reliable UPDATE payloads for payment approval listener
alter table public.payment_orders replica identity full;
