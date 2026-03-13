-- Free job apply: resume upload to resumes/free-leads/ failed with 403 when user is logged in.
-- Policy was "to anon" only; authenticated uploads only matched resumes_insert_own (uid folder).
-- Recreate policy so both anon and authenticated can insert into free-leads/ only.

drop policy if exists "resumes_insert_free_leads" on storage.objects;

create policy "resumes_insert_free_leads"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'free-leads'
  );
