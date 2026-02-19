-- Mock system redesign: Interviewer role, slot-based booking.
-- (1) interviewers table + is_interviewer()
-- (2) mock_slots table
-- (3) mock_registrations: slot_id, interviewer_id, feedback score columns

-- ========== 1) Interviewers table (same pattern as admins) ==========
create table if not exists public.interviewers (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.interviewers is 'Interviewers who conduct mock interviews; id = auth.uid().';

alter table public.interviewers enable row level security;

create policy "interviewers_select_own"
  on public.interviewers for select
  using (auth.uid() = id);

create policy "interviewers_update_own"
  on public.interviewers for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "interviewers_admin_all"
  on public.interviewers for all
  using (public.is_admin())
  with check (public.is_admin());

-- Interviewer can insert own row (on first login / onboarding)
create policy "interviewers_insert_own"
  on public.interviewers for insert
  with check (auth.uid() = id);

create or replace function public.is_interviewer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.interviewers where id = auth.uid());
$$;

-- updated_at trigger for interviewers
drop trigger if exists interviewers_updated_at on public.interviewers;
create trigger interviewers_updated_at
  before update on public.interviewers
  for each row execute function public.set_updated_at();

-- ========== 2) mock_slots table ==========
create table if not exists public.mock_slots (
  id uuid primary key default gen_random_uuid(),
  interviewer_id uuid not null references public.interviewers(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'available' check (status in ('available', 'booked', 'cancelled')),
  meet_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(interviewer_id, start_at)
);

comment on table public.mock_slots is 'Time slots for mock interviews; admin creates, aspirants book.';

alter table public.mock_slots enable row level security;

create policy "mock_slots_admin_all"
  on public.mock_slots for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "mock_slots_interviewer_select_own"
  on public.mock_slots for select
  using (interviewer_id = auth.uid());

-- Aspirants do not select directly; they use get_available_mock_slots RPC

-- ========== 3) mock_registrations: add slot_id, interviewer_id, feedback columns ==========
alter table public.mock_registrations
  add column if not exists slot_id uuid references public.mock_slots(id) on delete set null,
  add column if not exists interviewer_id uuid references public.interviewers(id) on delete set null;

alter table public.mock_registrations
  add column if not exists technical_score int check (technical_score is null or (technical_score >= 0 and technical_score <= 10)),
  add column if not exists communication_score int check (communication_score is null or (communication_score >= 0 and communication_score <= 10)),
  add column if not exists problem_solving_score int check (problem_solving_score is null or (problem_solving_score >= 0 and problem_solving_score <= 10)),
  add column if not exists overall_score int check (overall_score is null or (overall_score >= 0 and overall_score <= 10)),
  add column if not exists feedback_notes text,
  add column if not exists feedback_submitted_at timestamptz;

comment on column public.mock_registrations.slot_id is 'Set when aspirant books a slot; links to mock_slots.';
comment on column public.mock_registrations.interviewer_id is 'Interviewer who conducts this mock (from slot or admin-assigned).';
comment on column public.mock_registrations.technical_score is '0-10 from interviewer feedback.';
comment on column public.mock_registrations.communication_score is '0-10 from interviewer feedback.';
comment on column public.mock_registrations.problem_solving_score is '0-10 from interviewer feedback.';
comment on column public.mock_registrations.overall_score is '0-10 from interviewer feedback.';

-- Interviewers can select/update mock_registrations where they are the interviewer
create policy "mock_registrations_interviewer_own"
  on public.mock_registrations for select
  using (interviewer_id = auth.uid());

create policy "mock_registrations_interviewer_update_own"
  on public.mock_registrations for update
  using (interviewer_id = auth.uid())
  with check (interviewer_id = auth.uid());
