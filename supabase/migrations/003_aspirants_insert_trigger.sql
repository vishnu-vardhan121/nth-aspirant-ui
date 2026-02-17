-- Fix RLS insert: force id = auth.uid() on insert so the row passes the policy.
-- Run this in Supabase SQL Editor if you get "new row violates row-level security policy for table aspirants".

create or replace function public.aspirants_set_id()
returns trigger as $$
begin
  if auth.uid() is not null then
    new.id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists aspirants_set_id_trigger on public.aspirants;
create trigger aspirants_set_id_trigger
  before insert on public.aspirants
  for each row execute function public.aspirants_set_id();
