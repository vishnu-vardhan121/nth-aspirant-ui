-- Hero / pricing interview ticker: public must see the same week of rows admins curate.
-- 047 only allowed interview_date = today (IST), so anon saw empty while admins saw all rows.
-- 064 widened to ISO week; this migration aligns with Monday–Sunday in Asia/Kolkata (same
-- calendar week admins use) and adds an RPC so the UI can read without RLS surprises.

comment on table public.todays_interviews is
  'Hero ticker interviews. Admin CRUD by date; public (anon) may SELECT rows whose interview_date falls in the current Monday–Sunday week (Asia/Kolkata).';

-- ---------------------------------------------------------------------------
-- RLS: replace any prior public-read policy with IST calendar week (Mon–Sun)
-- ---------------------------------------------------------------------------
drop policy if exists "todays_interviews_public_today" on public.todays_interviews;
drop policy if exists "todays_interviews_public_week" on public.todays_interviews;
drop policy if exists "todays_interviews_public_window" on public.todays_interviews;
drop policy if exists "todays_interviews_public_ist_week" on public.todays_interviews;

create policy "todays_interviews_public_ist_week"
  on public.todays_interviews for select
  using (
    interview_date >= (
      (now() at time zone 'Asia/Kolkata')::date
      - (
        case extract(dow from (now() at time zone 'Asia/Kolkata')::date)::integer
          when 0 then 6
          else extract(dow from (now() at time zone 'Asia/Kolkata')::date)::integer - 1
        end
      )
    )
    and interview_date <= (
      (now() at time zone 'Asia/Kolkata')::date
      - (
        case extract(dow from (now() at time zone 'Asia/Kolkata')::date)::integer
          when 0 then 6
          else extract(dow from (now() at time zone 'Asia/Kolkata')::date)::integer - 1
        end
      )
      + 6
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: stable public read (security definer) for landing + pricing marquees
-- ---------------------------------------------------------------------------
create or replace function public.get_public_hero_interviews()
returns table (
  id uuid,
  name text,
  role text,
  level text,
  display_order int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.name,
    i.role,
    i.level,
    i.display_order
  from public.todays_interviews i
  where
    i.interview_date >= (
      (now() at time zone 'Asia/Kolkata')::date
      - (
        case extract(dow from (now() at time zone 'Asia/Kolkata')::date)::integer
          when 0 then 6
          else extract(dow from (now() at time zone 'Asia/Kolkata')::date)::integer - 1
        end
      )
    )
    and i.interview_date <= (
      (now() at time zone 'Asia/Kolkata')::date
      - (
        case extract(dow from (now() at time zone 'Asia/Kolkata')::date)::integer
          when 0 then 6
          else extract(dow from (now() at time zone 'Asia/Kolkata')::date)::integer - 1
        end
      )
      + 6
    )
  order by i.interview_date asc, i.display_order asc;
$$;

comment on function public.get_public_hero_interviews() is
  'Returns this week''s hero ticker rows (IST Mon–Sun) for anon/authenticated clients.';

revoke all on function public.get_public_hero_interviews() from public;
grant execute on function public.get_public_hero_interviews() to anon, authenticated;
