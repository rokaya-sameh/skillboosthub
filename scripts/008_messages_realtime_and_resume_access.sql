-- ============================================================
-- 008: Messages realtime + resume/CV upload access policy
-- Run after 001-007 on existing databases.
-- ============================================================

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

drop policy if exists uploads_read on storage.objects;
create policy uploads_read on storage.objects for select to authenticated
  using (
    bucket_id = 'uploads'
    and (
      name not like '%/resume/%'
      or owner = auth.uid()
      or public.is_instructor()
    )
  );