-- Combined: show_on_landing (008), deadline/walk-in/address (009), multi track + multi plan (010).
-- Run after 007_jobs.sql.

-- ========== 008: Show on landing ==========
alter table public.jobs
  add column if not exists show_on_landing boolean not null default false;

comment on column public.jobs.show_on_landing is 'If true, show this job on the landing page (free vs premium tabs).';

drop policy if exists "jobs_landing_select" on public.jobs;
create policy "jobs_landing_select"
  on public.jobs for select
  using (show_on_landing = true);

-- ========== 009: Application deadline, walk-in date, address, apply link ==========
alter table public.jobs
  add column if not exists application_deadline date,
  add column if not exists walk_in_date date,
  add column if not exists address text,
  add column if not exists apply_link text;

comment on column public.jobs.application_deadline is 'Last date to apply; after this date the application link is considered expired.';
comment on column public.jobs.walk_in_date is 'Date of walk-in interview if applicable.';
comment on column public.jobs.address is 'Full address / venue for interview or work location.';
comment on column public.jobs.apply_link is 'URL for Apply button (external job page or application form).';

-- ========== 010: Multiple audience tracks + multiple allowed plans ==========
alter table public.jobs
  add column if not exists audience_tracks text[] default '{}',
  add column if not exists allowed_plans text[];

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'jobs' and column_name = 'audience_track') then
    update public.jobs
    set
      audience_tracks = case when audience_track is not null then array[audience_track] else array['fresher'] end,
      allowed_plans = case when min_plan is not null then array[min_plan] else null end;
  end if;
end $$;

update public.jobs set audience_tracks = array['fresher'] where array_length(audience_tracks, 1) is null or audience_tracks = '{}';

alter table public.jobs alter column audience_tracks set not null;

-- Drop policy that depends on audience_track/min_plan before dropping those columns
drop policy if exists "jobs_aspirant_select" on public.jobs;

alter table public.jobs drop column if exists audience_track;
alter table public.jobs drop column if exists min_plan;

alter table public.jobs drop constraint if exists jobs_audience_tracks_check;
alter table public.jobs add constraint jobs_audience_tracks_check
  check (audience_tracks <@ array['fresher','experienced'] and array_length(audience_tracks, 1) >= 1);
alter table public.jobs drop constraint if exists jobs_allowed_plans_check;
alter table public.jobs add constraint jobs_allowed_plans_check
  check (allowed_plans is null or allowed_plans <@ array['base','silver','gold']);

comment on column public.jobs.audience_tracks is 'Target tracks: fresher and/or experienced.';
comment on column public.jobs.allowed_plans is 'For premium: which plans can see this job (base/silver/gold). Null = free (all plans).';

create policy "jobs_aspirant_select"
  on public.jobs for select
  using (
    status = 'open'
    and exists (
      select 1 from public.aspirants a
      where a.id = auth.uid()
      and a.track = any(jobs.audience_tracks)
      and (
        jobs.allowed_plans is null
        or array_length(jobs.allowed_plans, 1) is null
        or (a.plan is not null and a.plan = any(jobs.allowed_plans))
      )
    )
  );
