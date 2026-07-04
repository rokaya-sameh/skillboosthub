-- ============================================================
-- Storage buckets + policies
-- Run this THIRD.
-- ============================================================

-- avatars: public read, owner write
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- uploads: private (student data, submissions, notes, course covers)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- ---------- AVATARS (public bucket) ----------
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

-- ---------- UPLOADS (private bucket) ----------
-- Authenticated users can read shared uploads. Resume/CV files are limited to
-- the owner plus instructors/admins.
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

drop policy if exists uploads_write on storage.objects;
create policy uploads_write on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and owner = auth.uid());

drop policy if exists uploads_update on storage.objects;
create policy uploads_update on storage.objects for update to authenticated
  using (bucket_id = 'uploads' and owner = auth.uid());

drop policy if exists uploads_delete on storage.objects;
create policy uploads_delete on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (owner = auth.uid() or public.is_admin()));
