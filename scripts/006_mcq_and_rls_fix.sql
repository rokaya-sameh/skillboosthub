-- ============================================================
-- 006: MCQ task questions/options + fix all missing RLS
-- ============================================================

-- 1. task_questions: one row per question inside a task
CREATE TABLE IF NOT EXISTS public.task_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL DEFAULT 0,
  question     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. task_options: one row per answer choice for a question
CREATE TABLE IF NOT EXISTS public.task_options (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES public.task_questions(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL DEFAULT 0,
  text         TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT false
);

-- 3. student_answers: student's chosen option per question per submission
CREATE TABLE IF NOT EXISTS public.student_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES public.task_questions(id) ON DELETE CASCADE,
  option_id     UUID REFERENCES public.task_options(id) ON DELETE SET NULL,
  UNIQUE (submission_id, question_id)
);

-- ============================================================
-- RLS: task_questions
-- ============================================================
ALTER TABLE public.task_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tq_select" ON public.task_questions;
CREATE POLICY "tq_select" ON public.task_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "tq_insert" ON public.task_questions;
CREATE POLICY "tq_insert" ON public.task_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','instructor')
    )
  );

DROP POLICY IF EXISTS "tq_update" ON public.task_questions;
CREATE POLICY "tq_update" ON public.task_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','instructor')
    )
  );

DROP POLICY IF EXISTS "tq_delete" ON public.task_questions;
CREATE POLICY "tq_delete" ON public.task_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','instructor')
    )
  );

-- ============================================================
-- RLS: task_options
-- ============================================================
ALTER TABLE public.task_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "to_select" ON public.task_options;
CREATE POLICY "to_select" ON public.task_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "to_insert" ON public.task_options;
CREATE POLICY "to_insert" ON public.task_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','instructor')
    )
  );

DROP POLICY IF EXISTS "to_update" ON public.task_options;
CREATE POLICY "to_update" ON public.task_options FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','instructor')
    )
  );

DROP POLICY IF EXISTS "to_delete" ON public.task_options;
CREATE POLICY "to_delete" ON public.task_options FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','instructor')
    )
  );

-- ============================================================
-- RLS: student_answers
-- ============================================================
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sa_select" ON public.student_answers;
CREATE POLICY "sa_select" ON public.student_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_id
        AND (
          s.student_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','instructor'))
        )
    )
  );

DROP POLICY IF EXISTS "sa_insert" ON public.student_answers;
CREATE POLICY "sa_insert" ON public.student_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_id AND s.student_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: messages (was entirely missing — this is why send failed)
-- ============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select" ON public.messages;
CREATE POLICY "msg_select" ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "msg_insert" ON public.messages;
CREATE POLICY "msg_insert" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "msg_update_read" ON public.messages;
CREATE POLICY "msg_update_read" ON public.messages FOR UPDATE
  USING (auth.uid() = recipient_id);

-- ============================================================
-- RLS: tasks (was also missing)
-- ============================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "tasks_admin_write" ON public.tasks;
CREATE POLICY "tasks_admin_write" ON public.tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','instructor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','instructor')
    )
  );

-- ============================================================
-- RLS: profiles (ensure admin can read all for users page)
-- ============================================================
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );
