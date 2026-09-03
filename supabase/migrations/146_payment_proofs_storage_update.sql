-- payment-proofs uploads use upsert:true (course Golden + placement UPI).
-- Insert/select alone is not enough — upsert needs update (and delete for overwrite).

drop policy if exists "payment_proofs_update_own" on storage.objects;
create policy "payment_proofs_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "payment_proofs_delete_own" on storage.objects;
create policy "payment_proofs_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
