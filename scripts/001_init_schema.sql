-- ============================================================
-- Skill Boost Hub — Core LMS Schema
-- Run this FIRST. Safe to re-run (idempotent where possible).
-- ============================================================

-- ---------- ENUM TYPES ----------
do $$ begin
  create type user_role as enum ('student', 'instructor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrollment_status as enum ('active', 'completed', 'dropped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('pending', 'submitted', 'graded', 'returned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('active', 'banned');
exception when duplicate_object then null; end $$;

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'student',
  status account_status not null default 'active',
  avatar_url text,
  headline text,
  bio text,
  location text,
  phone text,
  track text,
  cohort text,
  resume_url text,
  gpa numeric(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- COURSES ----------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  category text,
  level text default 'beginner',
  cover_url text,
  instructor_id uuid references public.profiles(id) on delete set null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- MODULES ----------
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position int not null default 0
);

-- ---------- LESSONS ----------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  duration_minutes int default 0,
  position int not null default 0
);

-- ---------- TASKS (assignments / capstone) ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  description text,
  max_points int not null default 100,
  is_capstone boolean not null default false,
  position int not null default 0,
  due_date date
);

-- ---------- ENROLLMENTS ----------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- ---------- LESSON PROGRESS ----------
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (student_id, lesson_id)
);

-- ---------- SUBMISSIONS (task tracking, Udemy style) ----------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  file_url text,
  status submission_status not null default 'submitted',
  grade numeric(5,2),
  feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  unique (task_id, student_id)
);

-- ---------- MESSAGES (student <-> instructor chat) ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  body text not null,
  file_url text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- STUDY GROUPS ----------
create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  course_id uuid references public.courses(id) on delete set null,
  schedule text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

-- ---------- GROUP ATTENDANCE (with note uploads) ----------
create table if not exists public.group_attendance (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null default current_date,
  attended boolean not null default true,
  note_text text,
  note_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.group_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

-- ---------- CAPSTONE EVALUATIONS (GPA tracking) ----------
create table if not exists public.capstone_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null default 'Capstone Evaluation',
  score numeric(5,2),
  gpa numeric(3,2),
  rubric jsonb,
  feedback text,
  evaluator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- BADGES (light gamification) ----------
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  rarity text default 'common'
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------- INDEXES ----------
create index if not exists idx_courses_instructor on public.courses(instructor_id);
create index if not exists idx_enrollments_student on public.enrollments(student_id);
create index if not exists idx_enrollments_course on public.enrollments(course_id);
create index if not exists idx_submissions_student on public.submissions(student_id);
create index if not exists idx_submissions_task on public.submissions(task_id);
create index if not exists idx_messages_recipient on public.messages(recipient_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_lesson_progress_student on public.lesson_progress(student_id);
create index if not exists idx_group_notes_group on public.group_notes(group_id);
