-- Hero interview ticker: allow public (anon + non-admin authenticated) to read rows
-- for the current calendar week (Monday–Sunday, Asia/Kolkata), not only "today".
-- Admins still have full-table access via todays_interviews_admin_all.

comment on table public.todays_interviews is
  'Hero ticker interviews. Admin CRUD by date; public sees rows whose interview_date falls in the current ISO week (Mon–Sun, Asia/Kolkata).';

drop policy if exists "todays_interviews_public_today" on public.todays_interviews;

create policy "todays_interviews_public_week"
  on public.todays_interviews for select
  using (
    interview_date >= (
      (current_timestamp at time zone 'Asia/Kolkata')::date
      - (extract(isodow from (current_timestamp at time zone 'Asia/Kolkata')::date)::integer - 1)
    )
    and interview_date <= (
      (current_timestamp at time zone 'Asia/Kolkata')::date
      - (extract(isodow from (current_timestamp at time zone 'Asia/Kolkata')::date)::integer - 1)
      + 6
    )
  );
