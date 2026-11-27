-- =====================================================================
-- 0004_storage_realtime.sql - Bucket file desain & update realtime (Tanpa Login)
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('order-files', 'order-files', true)
on conflict (id) do update set public = true;

create policy "order_files_storage_all" on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'order-files')
  with check (bucket_id = 'order-files');

-- Kirim perubahan order & timeline ke browser secara realtime
alter publication supabase_realtime add table public.orders, public.order_logs;
