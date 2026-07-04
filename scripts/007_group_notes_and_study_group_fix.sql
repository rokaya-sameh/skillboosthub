-- ============================================================
-- 007: Study group table-name alignment + shared notes
-- Run after 001-006 on existing databases.
-- ============================================================

create table if not exists public.group_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_notes_group on public.group_notes(group_id);

alter table public.study_group_members enable row level security;
alter table public.group_attendance enable row level security;
alter table public.group_notes enable row level security;

drop policy if exists group_members_all on public.study_group_members;
create policy group_members_all on public.study_group_members for all to authenticated
  using (student_id = auth.uid() or public.is_instructor())
  with check (student_id = auth.uid() or public.is_instructor());

drop policy if exists attendance_all on public.group_attendance;
create policy attendance_all on public.group_attendance for all to authenticated
  using (student_id = auth.uid() or public.is_instructor())
  with check (student_id = auth.uid() or public.is_instructor());

drop policy if exists group_notes_select on public.group_notes;
create policy group_notes_select on public.group_notes for select to authenticated using (true);

drop policy if exists group_notes_insert on public.group_notes;
create policy group_notes_insert on public.group_notes for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.study_group_members m
      where m.group_id = group_notes.group_id and m.student_id = auth.uid()
    )
  );

drop policy if exists group_notes_delete on public.group_notes;
create policy group_notes_delete on public.group_notes for delete to authenticated
  using (student_id = auth.uid() or public.is_instructor());