-- Institute ads for landing page modal. Admin manages; only one can be active; anon sees active one.

create table if not exists public.institute_ads (
  id uuid primary key default gen_random_uuid(),
  institute_name text not null,
  image_url text not null,
  link_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.institute_ads is 'Training institute / partner ads shown in landing page modal. Only one is_active at a time.';
comment on column public.institute_ads.institute_name is 'Display name of the institute.';
comment on column public.institute_ads.image_url is 'URL of the poster image (e.g. Supabase storage or external).';
comment on column public.institute_ads.link_url is 'Optional URL for poster click-through.';
comment on column public.institute_ads.is_active is 'When true, this ad is shown on landing; only one row should be true.';

alter table public.institute_ads enable row level security;

-- Anon and everyone: can read the single active ad (for landing page).
create policy "institute_ads_public_select_active"
  on public.institute_ads for select
  using (is_active = true);

-- Admin: full CRUD.
create policy "institute_ads_admin_all"
  on public.institute_ads for all
  using (public.is_admin())
  with check (public.is_admin());

-- updated_at trigger
drop trigger if exists institute_ads_updated_at on public.institute_ads;
create trigger institute_ads_updated_at
  before update on public.institute_ads
  for each row execute function public.set_updated_at();

-- When one ad is set is_active = true, set all others to false (only one active).
create or replace function public.institute_ads_one_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active = true then
    update public.institute_ads set is_active = false where id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists institute_ads_one_active_trigger on public.institute_ads;
create trigger institute_ads_one_active_trigger
  after insert or update of is_active on public.institute_ads
  for each row
  when (new.is_active = true)
  execute function public.institute_ads_one_active();
