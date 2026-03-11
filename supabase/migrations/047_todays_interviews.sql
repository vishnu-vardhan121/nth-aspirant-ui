-- Today's Interviews: hero section ticker. Admin manages by date; public sees only today.
-- Run after 002 (admins, is_admin, set_updated_at).

create table if not exists public.todays_interviews (
  id uuid primary key default gen_random_uuid(),
  interview_date date not null,
  name text not null,
  role text not null,
  level text not null check (level in ('Fresher', 'Experienced')),
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.todays_interviews is 'Hero ticker "Today''s Interviews". Admin CRUD by date; public sees only rows for today (India date).';

create index if not exists idx_todays_interviews_date on public.todays_interviews (interview_date);
create index if not exists idx_todays_interviews_date_order on public.todays_interviews (interview_date, display_order);

alter table public.todays_interviews enable row level security;

-- Public: SELECT only for "today" (India date)
drop policy if exists "todays_interviews_public_today" on public.todays_interviews;
create policy "todays_interviews_public_today"
  on public.todays_interviews for select
  using (
    interview_date = ((current_timestamp at time zone 'Asia/Kolkata')::date)
  );

-- Admin: full CRUD
drop policy if exists "todays_interviews_admin_all" on public.todays_interviews;
create policy "todays_interviews_admin_all"
  on public.todays_interviews for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists todays_interviews_updated_at on public.todays_interviews;
create trigger todays_interviews_updated_at
  before update on public.todays_interviews
  for each row execute function public.set_updated_at();
