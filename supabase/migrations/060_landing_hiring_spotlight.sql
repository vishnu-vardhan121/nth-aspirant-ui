-- Landing "Shortlist updates" spotlight: job flags + admin notices + public RPC.

alter table public.jobs
  add column if not exists hiring_spotlight boolean not null default false,
  add column if not exists hiring_spotlight_order integer not null default 100;

comment on column public.jobs.hiring_spotlight is
  'If true, this open landing-visible job appears in get_landing_hiring_spotlight with notices and shortlisted names.';
comment on column public.jobs.hiring_spotlight_order is
  'Lower numbers sort first in the landing spotlight grid.';

create table if not exists public.job_landing_notices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_landing_notices_job_created
  on public.job_landing_notices (job_id, created_at desc);

comment on table public.job_landing_notices is
  'Announcements for a job, shown on the landing hiring spotlight (newest first).';

alter table public.job_landing_notices enable row level security;

drop policy if exists "job_landing_notices_admin_all" on public.job_landing_notices;

create policy "job_landing_notices_admin_all"
  on public.job_landing_notices for all
  using (public.is_admin())
  with check (public.is_admin());

-- Public read only through security definer RPC below (no anon select on table).

create or replace function public.get_landing_hiring_spotlight()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb := '[]'::jsonb;
  jrec record;
  v_notices jsonb;
  v_shortlisted jsonb;
begin
  for jrec in
    select j.id, j.title, j.company_name, j.location
    from public.jobs j
    where j.status = 'open'
      and j.show_on_landing = true
      and j.hiring_spotlight = true
    order by j.hiring_spotlight_order asc, j.created_at desc
    limit 12
  loop
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'message', t.body,
        'at', to_char(timezone('Asia/Kolkata', t.created_at), 'FMDD Mon, HH12:MI AM')
      ) order by t.created_at desc
    ), '[]'::jsonb)
    into v_notices
    from (
      select n.id, n.body, n.created_at
      from public.job_landing_notices n
      where n.job_id = jrec.id
      order by n.created_at desc
      limit 20
    ) t;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', x.aid,
        'name', x.nm,
        'city', x.ct
      ) order by x.sort_ts desc
    ), '[]'::jsonb)
    into v_shortlisted
    from (
      select a.id as aid,
        p.full_name as nm,
        coalesce(nullif(trim(p.city), ''), nullif(trim(jrec.location), ''), '—'::text) as ct,
        a.created_at as sort_ts
      from public.applications a
      join public.aspirants p on p.id = a.aspirant_id
      where a.job_id = jrec.id and a.status = 'shortlisted'
      union all
      select f.id as aid,
        f.name as nm,
        coalesce(nullif(trim(jrec.location), ''), '—'::text) as ct,
        f.created_at as sort_ts
      from public.free_job_leads f
      where f.job_id = jrec.id and f.status = 'shortlisted'
    ) x;

    v_out := v_out || jsonb_build_array(
      jsonb_build_object(
        'id', jrec.id,
        'title', jrec.title,
        'company_name', jrec.company_name,
        'location', jrec.location,
        'notices', v_notices,
        'shortlisted', v_shortlisted
      )
    );
  end loop;

  return v_out;
end;
$$;

comment on function public.get_landing_hiring_spotlight() is
  'Anonymous: open spotlight jobs with notices (newest first) and shortlisted candidates (platform + public leads).';

grant execute on function public.get_landing_hiring_spotlight() to anon;
grant execute on function public.get_landing_hiring_spotlight() to authenticated;
