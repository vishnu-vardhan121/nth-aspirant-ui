-- Allow multiple active spotlight rows and explicit ranking order.
-- Main card uses sequence_no = 1, lower numbers appear first.

alter table public.landing_institute_spotlight
  add column if not exists sequence_no integer not null default 1;

create index if not exists idx_landing_spotlight_sequence
  on public.landing_institute_spotlight (sequence_no asc, created_at desc);

-- Old behavior forced a single active row. Drop it to support main + bottom list.
drop trigger if exists landing_spotlight_one_active_trigger on public.landing_institute_spotlight;
drop function if exists public.landing_spotlight_one_active();

comment on table public.landing_institute_spotlight is 'Landing institute spotlight list. Active rows are shown publicly, ordered by sequence_no.';
comment on column public.landing_institute_spotlight.sequence_no is 'Display order for active rows. 1 is primary spotlight.';
