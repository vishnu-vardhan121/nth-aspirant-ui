-- Landing "best institute" spotlight section. One active row; anon reads active; admin CRUD.
-- Image: admin uploads to institute-ads bucket (path spotlight/...); image_url stores public URL.

create table if not exists public.landing_institute_spotlight (
  id uuid primary key default gen_random_uuid(),
  badge text not null default 'Partner spotlight',
  title text not null,
  institute_name text not null,
  subtext text not null,
  highlight text,
  cta_link text,
  cta_label text not null default 'Open link',
  left_panel_label text not null default 'Featured partner',
  image_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.landing_institute_spotlight is 'Single spotlight block on landing (e.g. best institute). Only one is_active.';
comment on column public.landing_institute_spotlight.cta_link is 'If set, landing shows button (external http(s) new tab; else in-app Link).';
comment on column public.landing_institute_spotlight.image_url is 'Left panel image: public URL after upload to storage or external URL; if null, gradient + icon.';

alter table public.landing_institute_spotlight enable row level security;

-- Idempotent: safe if migration was partially applied or re-run
drop policy if exists "landing_spotlight_public_select_active" on public.landing_institute_spotlight;
create policy "landing_spotlight_public_select_active"
  on public.landing_institute_spotlight for select
  using (is_active = true);

drop policy if exists "landing_spotlight_admin_all" on public.landing_institute_spotlight;
create policy "landing_spotlight_admin_all"
  on public.landing_institute_spotlight for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists landing_institute_spotlight_updated_at on public.landing_institute_spotlight;
create trigger landing_institute_spotlight_updated_at
  before update on public.landing_institute_spotlight
  for each row execute function public.set_updated_at();

create or replace function public.landing_spotlight_one_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active = true then
    update public.landing_institute_spotlight set is_active = false where id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists landing_spotlight_one_active_trigger on public.landing_institute_spotlight;
create trigger landing_spotlight_one_active_trigger
  after insert or update of is_active on public.landing_institute_spotlight
  for each row
  when (new.is_active = true)
  execute function public.landing_spotlight_one_active();
