'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireProfile } from '@/lib/auth'

export async function enroll(courseId: string) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { error } = await supabase
    .from('enrollments')
    .insert({ student_id: profile.id, course_id: courseId })
  if (error && !error.message.includes('duplicate')) return { error: error.message }
  revalidatePath('/courses')
  revalidatePath(`/courses/${courseId}`)
  return { success: true }
}

export async function toggleLessonComplete(lessonId: string, courseId: string, completed: boolean) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { error } = await supabase.from('lesson_progress').upsert(
    {
      student_id: profile.id,
      lesson_id: lessonId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: 'student_id,lesson_id' },
  )
  if (error) return { error: error.message }
  revalidatePath(`/courses/${courseId}`)
  return { success: true }
}

export async function submitTask(formData: FormData) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const taskId = formData.get('task_id') as string
  const courseId = formData.get('course_id') as string
  const content = (formData.get('content') as string)?.trim() || null
  const fileUrl = (formData.get('file_url') as string) || null
  const answersRaw = (formData.get('answers') as string) || '[]'

  const { data: submission, error } = await supabase.from('submissions').upsert(
    {
      task_id: taskId,
      student_id: profile.id,
      content,
      file_url: fileUrl,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'task_id,student_id' },
  ).select('id').single()
  if (error) return { error: error.message }

  let answers: { question_id: string; option_id: string }[] = []
  try {
    answers = JSON.parse(answersRaw) as { question_id: string; option_id: string }[]
  } catch {
    return { error: 'Invalid answers payload' }
  }

  if (answers.length > 0 && submission?.id) {
    const admin = createAdminClient()
    const { data: questions } = await admin
      .from('task_questions')
      .select('id, task_options(id)')
      .eq('task_id', taskId)

    const validOptionsByQuestion = new Map<string, Set<string>>()
    for (const question of (questions as { id: string; task_options: { id: string }[] }[]) ?? []) {
      validOptionsByQuestion.set(question.id, new Set(question.task_options.map((option) => option.id)))
    }

    const rows = answers
      .filter((answer) => validOptionsByQuestion.get(answer.question_id)?.has(answer.option_id))
      .map((answer) => ({
        submission_id: submission.id,
        question_id: answer.question_id,
        option_id: answer.option_id,
      }))

    if (rows.length !== answers.length) return { error: 'One or more answers are invalid' }

    await admin.from('student_answers').delete().eq('submission_id', submission.id)
    const { error: answersError } = await admin.from('student_answers').insert(rows)
    if (answersError) return { error: answersError.message }
  }

  revalidatePath(`/courses/${courseId}`)
  return { success: true }
}
