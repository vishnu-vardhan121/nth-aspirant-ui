-- Storage bucket for institute ad poster images. Public read so landing page can show images; admin write.
-- Run after 002 (is_admin).

insert into storage.buckets (id, name, public)
values ('institute-ads', 'institute-ads', true)
on conflict (id) do update set public = true;

-- Admin: insert/update/delete (upload and replace images)
drop policy if exists "institute_ads_storage_insert" on storage.objects;
create policy "institute_ads_storage_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'institute-ads' and public.is_admin());

drop policy if exists "institute_ads_storage_update" on storage.objects;
create policy "institute_ads_storage_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'institute-ads' and public.is_admin())
  with check (bucket_id = 'institute-ads' and public.is_admin());

drop policy if exists "institute_ads_storage_delete" on storage.objects;
create policy "institute_ads_storage_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'institute-ads' and public.is_admin());

-- Public read so landing page can display the active ad image (anon and authenticated)
drop policy if exists "institute_ads_storage_select_anon" on storage.objects;
create policy "institute_ads_storage_select_anon"
  on storage.objects for select to anon
  using (bucket_id = 'institute-ads');

drop policy if exists "institute_ads_storage_select_auth" on storage.objects;
create policy "institute_ads_storage_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'institute-ads');
