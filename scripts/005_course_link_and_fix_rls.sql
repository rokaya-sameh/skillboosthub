-- ============================================================
-- Migration: Add course_link, duration, objectives to courses
-- Fix messages RLS to allow inserts between any authenticated users
-- Fix profiles RLS so admin can read all profiles
-- ============================================================

-- Add new columns to courses (idempotent)
alter table public.courses
  add column if not exists course_link text,
  add column if not exists duration_hours numeric(5,1),
  add column if not exists objectives text[];

-- ----------------------------------------------------------------
-- Fix MESSAGES RLS
-- The previous policies were too restrictive — DROP and re-create.
-- ----------------------------------------------------------------
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;
drop policy if exists "messages_update" on public.messages;

-- Any authenticated user can read messages they sent or received.
create policy "messages_select"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Any authenticated user can send a message (insert as sender).
create policy "messages_insert"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- Recipients can mark their messages as read.
create policy "messages_update"
  on public.messages for update
  using (auth.uid() = recipient_id);

-- ----------------------------------------------------------------
-- Fix PROFILES RLS — admin needs to read all profiles
-- ----------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;

-- Users can see their own profile; admins can see everyone.
create policy "profiles_select_own"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- Fix TASKS RLS — instructors and admins need to read all tasks
-- ----------------------------------------------------------------
drop policy if exists "tasks_select" on public.tasks;

create policy "tasks_select"
  on public.tasks for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = tasks.course_id
      and (
        c.published = true
        or c.instructor_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
    )
  );

-- Admins can insert/update/delete tasks
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

create policy "tasks_insert"
  on public.tasks for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'instructor'))
  );

create policy "tasks_update"
  on public.tasks for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'instructor'))
  );

create policy "tasks_delete"
  on public.tasks for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'instructor'))
  );
