-- Resume upload: bucket + RLS. Store path in aspirants.resume_url (path only, e.g. userId/resume.pdf).
-- Run after 001 (aspirants has resume_url), 005 (is_admin).

-- Create private bucket for resumes (create via Dashboard if this fails: Storage → New bucket → id: resumes, private)
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Aspirant: upload to own folder only (path = auth.uid()/filename)
create policy "resumes_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Aspirant: read own folder
create policy "resumes_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Aspirant: update/delete own folder (for replacing resume)
create policy "resumes_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "resumes_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Admin: read all resumes (for viewing applicant resume)
create policy "resumes_select_admin"
  on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and public.is_admin());
