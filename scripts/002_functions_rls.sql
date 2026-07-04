-- ============================================================
-- Helper functions, profile trigger, and Row Level Security
-- Run this SECOND (after 001_init_schema.sql).
-- ============================================================

-- ---------- HELPER FUNCTIONS (security definer avoids RLS recursion) ----------
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_instructor()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('instructor','admin'));
$$;

-- Is the current user the instructor that owns this course?
create or replace function public.owns_course(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.courses where id = cid and instructor_id = auth.uid());
$$;

-- ---------- AUTO-CREATE PROFILE ON SIGNUP ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ENABLE RLS ----------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.tasks enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.submissions enable row level security;
alter table public.messages enable row level security;
alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.group_attendance enable row level security;
alter table public.group_notes enable row level security;
alter table public.capstone_evaluations enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- ---------- PROFILES ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- COURSES ----------
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select to authenticated
  using (published or instructor_id = auth.uid() or public.is_admin());

drop policy if exists courses_instructor_write on public.courses;
create policy courses_instructor_write on public.courses for all to authenticated
  using (instructor_id = auth.uid() or public.is_admin())
  with check (instructor_id = auth.uid() or public.is_admin());

-- ---------- MODULES / LESSONS / TASKS (readable to authenticated; writable by course owner/admin) ----------
drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules for select to authenticated using (true);
drop policy if exists modules_write on public.modules;
create policy modules_write on public.modules for all to authenticated
  using (public.owns_course(course_id) or public.is_admin())
  with check (public.owns_course(course_id) or public.is_admin());

drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select to authenticated using (true);
drop policy if exists lessons_write on public.lessons;
create policy lessons_write on public.lessons for all to authenticated
  using (public.is_instructor()) with check (public.is_instructor());

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated using (true);
drop policy if exists tasks_write on public.tasks;
create policy tasks_write on public.tasks for all to authenticated
  using (public.owns_course(course_id) or public.is_admin())
  with check (public.owns_course(course_id) or public.is_admin());

-- ---------- ENROLLMENTS ----------
drop policy if exists enrollments_student on public.enrollments;
create policy enrollments_student on public.enrollments for all to authenticated
  using (student_id = auth.uid() or public.owns_course(course_id) or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

-- ---------- LESSON PROGRESS ----------
drop policy if exists progress_student on public.lesson_progress;
create policy progress_student on public.lesson_progress for all to authenticated
  using (student_id = auth.uid() or public.is_instructor())
  with check (student_id = auth.uid());

-- ---------- SUBMISSIONS ----------
drop policy if exists submissions_select on public.submissions;
create policy submissions_select on public.submissions for select to authenticated
  using (student_id = auth.uid() or public.is_instructor());

drop policy if exists submissions_student_write on public.submissions;
create policy submissions_student_write on public.submissions for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists submissions_student_update on public.submissions;
create policy submissions_student_update on public.submissions for update to authenticated
  using (student_id = auth.uid() or public.is_instructor())
  with check (student_id = auth.uid() or public.is_instructor());

drop policy if exists submissions_admin_del on public.submissions;
create policy submissions_admin_del on public.submissions for delete to authenticated
  using (student_id = auth.uid() or public.is_admin());

-- ---------- MESSAGES ----------
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid());
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (recipient_id = auth.uid() or sender_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- ---------- STUDY GROUPS ----------
drop policy if exists groups_select on public.study_groups;
create policy groups_select on public.study_groups for select to authenticated using (true);
drop policy if exists groups_write on public.study_groups;
create policy groups_write on public.study_groups for all to authenticated
  using (created_by = auth.uid() or public.is_instructor())
  with check (created_by = auth.uid() or public.is_instructor());

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

-- ---------- CAPSTONE EVALUATIONS (GPA) ----------
drop policy if exists capstone_select on public.capstone_evaluations;
create policy capstone_select on public.capstone_evaluations for select to authenticated
  using (student_id = auth.uid() or public.is_instructor());
drop policy if exists capstone_write on public.capstone_evaluations;
create policy capstone_write on public.capstone_evaluations for all to authenticated
  using (public.is_instructor()) with check (public.is_instructor());

-- ---------- BADGES ----------
drop policy if exists badges_select on public.badges;
create policy badges_select on public.badges for select to authenticated using (true);
drop policy if exists badges_admin on public.badges;
create policy badges_admin on public.badges for all to authenticated
  using (public.is_instructor()) with check (public.is_instructor());

drop policy if exists user_badges_select on public.user_badges;
create policy user_badges_select on public.user_badges for select to authenticated using (true);
drop policy if exists user_badges_write on public.user_badges;
create policy user_badges_write on public.user_badges for all to authenticated
  using (public.is_instructor()) with check (public.is_instructor());
