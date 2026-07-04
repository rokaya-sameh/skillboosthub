"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth"
import type { Course, Lesson, Module, Profile, Role, Task, TaskOption, TaskQuestion } from "@/lib/types"

export type TaskWithQuestions = Task & { questions: (TaskQuestion & { options: TaskOption[] })[] }
export type ModuleWithLessons = Module & { lessons: Lesson[] }
export type CourseWithTasks = Course & { modules: ModuleWithLessons[]; tasks: TaskWithQuestions[] }

export async function getAdminUsers() {
  await requireRole(["admin"])
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data as Profile[]) ?? []
}

export async function getAdminDashboardStats() {
  await requireRole(["admin"])
  const admin = createAdminClient()

  const [
    { count: studentCount },
    { count: instructorCount },
    { count: courseCount },
    { count: submissionCount },
    { count: pendingCount },
    { count: messageCount },
    { count: groupCount },
    { count: bannedCount },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "instructor"),
    admin.from("courses").select("*", { count: "exact", head: true }),
    admin.from("submissions").select("*", { count: "exact", head: true }),
    admin.from("submissions").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    admin.from("messages").select("*", { count: "exact", head: true }),
    admin.from("study_groups").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("status", "banned"),
  ])

  return {
    studentCount: studentCount ?? 0,
    instructorCount: instructorCount ?? 0,
    courseCount: courseCount ?? 0,
    submissionCount: submissionCount ?? 0,
    pendingCount: pendingCount ?? 0,
    messageCount: messageCount ?? 0,
    groupCount: groupCount ?? 0,
    bannedCount: bannedCount ?? 0,
  }
}

export async function getAdminContent() {
  await requireRole(["admin"])
  const admin = createAdminClient()

  const [
    { data: courses, error: coursesError },
    { data: modules, error: modulesError },
    { data: lessons, error: lessonsError },
    { data: tasks, error: tasksError },
    { data: questions, error: questionsError },
    { data: options, error: optionsError },
  ] =
    await Promise.all([
      admin.from("courses").select("*").order("created_at", { ascending: false }),
      admin.from("modules").select("*").order("position", { ascending: true }),
      admin.from("lessons").select("*").order("position", { ascending: true }),
      admin.from("tasks").select("*").order("position", { ascending: true }),
      admin.from("task_questions").select("*").order("position", { ascending: true }),
      admin.from("task_options").select("*").order("position", { ascending: true }),
    ])

  const error = coursesError ?? modulesError ?? lessonsError ?? tasksError ?? questionsError ?? optionsError
  if (error) throw new Error(error.message)

  const lessonsByModule = new Map<string, Lesson[]>()
  for (const lesson of (lessons as Lesson[]) ?? []) {
    const existing = lessonsByModule.get(lesson.module_id) ?? []
    existing.push(lesson)
    lessonsByModule.set(lesson.module_id, existing)
  }

  const modulesByCourse = new Map<string, ModuleWithLessons[]>()
  for (const module of (modules as Module[]) ?? []) {
    const full = { ...module, lessons: lessonsByModule.get(module.id) ?? [] }
    const existing = modulesByCourse.get(module.course_id) ?? []
    existing.push(full)
    modulesByCourse.set(module.course_id, existing)
  }

  const optsByQuestion = new Map<string, TaskOption[]>()
  for (const option of (options as TaskOption[]) ?? []) {
    const existing = optsByQuestion.get(option.question_id) ?? []
    existing.push(option)
    optsByQuestion.set(option.question_id, existing)
  }

  const questionsByTask = new Map<string, (TaskQuestion & { options: TaskOption[] })[]>()
  for (const question of (questions as TaskQuestion[]) ?? []) {
    const full = { ...question, options: optsByQuestion.get(question.id) ?? [] }
    const existing = questionsByTask.get(question.task_id) ?? []
    existing.push(full)
    questionsByTask.set(question.task_id, existing)
  }

  const tasksByCourse = new Map<string, TaskWithQuestions[]>()
  for (const task of (tasks as Task[]) ?? []) {
    const full = { ...task, questions: questionsByTask.get(task.id) ?? [] }
    const existing = tasksByCourse.get(task.course_id) ?? []
    existing.push(full)
    tasksByCourse.set(task.course_id, existing)
  }

  return ((courses as Course[]) ?? []).map((course) => ({
    ...course,
    modules: modulesByCourse.get(course.id) ?? [],
    tasks: tasksByCourse.get(course.id) ?? [],
  }))
}

export async function setUserStatus(userId: string, status: "active" | "banned") {
  await requireRole(["admin"])
  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ status }).eq("id", userId)
  if (error) return { error: error.message }
  // Also revoke/restore auth-level ban so the session is enforced immediately.
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: status === "banned" ? "876000h" : "none",
  })
  revalidatePath("/admin/users")
  return { success: true }
}

export async function setUserRole(userId: string, role: Role) {
  await requireRole(["admin"])
  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId)
  if (error) return { error: error.message }
  revalidatePath("/admin/users")
  return { success: true }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireRole(["admin"])
  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteUser(userId: string) {
  await requireRole(["admin"])
  const admin = createAdminClient()
  // profiles + dependent rows cascade via FK; remove the auth user last.
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  revalidatePath("/admin/users")
  return { success: true }
}

export async function deleteCourse(courseId: string) {
  await requireRole(["admin"])
  const admin = createAdminClient()
  const { error } = await admin.from("courses").delete().eq("id", courseId)
  if (error) return { error: error.message }
  revalidatePath("/admin/content")
  return { success: true }
}

export async function toggleCoursePublished(courseId: string, published: boolean) {
  await requireRole(["admin"])
  const admin = createAdminClient()
  const { error } = await admin.from("courses").update({ published }).eq("id", courseId)
  if (error) return { error: error.message }
  revalidatePath("/admin/content")
  return { success: true }
}

export async function upsertCourse(formData: FormData) {
  await requireRole(["admin"])
  const admin = createAdminClient()
  const id = (formData.get("id") as string) || null
  const rawObjectives = (formData.get("objectives") as string) || ""
  const objectives = rawObjectives
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)

  const payload = {
    title: (formData.get("title") as string)?.trim(),
    description: (formData.get("description") as string)?.trim() || null,
    category: (formData.get("category") as string)?.trim() || null,
    level: (formData.get("level") as string)?.trim() || null,
    course_link: (formData.get("course_link") as string)?.trim() || null,
    duration_hours: parseFloat(formData.get("duration_hours") as string) || null,
    objectives: objectives.length ? objectives : null,
    published: formData.get("published") === "true",
  }
  if (!payload.title) return { error: "Title is required" }

  const query = id
    ? admin.from("courses").update(payload).eq("id", id)
    : admin.from("courses").insert(payload)
  const { error, data } = await query.select("id").single()
  if (error) return { error: error.message }
  revalidatePath("/admin/content")
  return { success: true, id: (data as { id: string } | null)?.id ?? id }
}

export async function upsertTask(formData: FormData) {
  await requireRole(["admin", "instructor"])
  const admin = createAdminClient()
  const id = (formData.get("id") as string) || null
  const courseId = formData.get("course_id") as string
  const lessonId = (formData.get("lesson_id") as string) || null
  if (!courseId) return { error: "course_id required" }

  const payload = {
    course_id: courseId,
    lesson_id: lessonId,
    title: (formData.get("title") as string)?.trim(),
    description: (formData.get("description") as string)?.trim() || null,
    instructions: (formData.get("instructions") as string)?.trim() || null,
    max_points: parseInt(formData.get("max_points") as string) || 100,
    is_capstone: formData.get("is_capstone") === "true",
    due_date: (formData.get("due_date") as string) || null,
    position: parseInt(formData.get("position") as string) || 0,
  }
  if (!payload.title) return { error: "Task title is required" }

  const query = id
    ? admin.from("tasks").update(payload).eq("id", id)
    : admin.from("tasks").insert(payload)
  const { error } = await query
  if (error) return { error: error.message }
  revalidatePath("/admin/content")
  return { success: true }
}

export async function upsertModule(formData: FormData) {
  await requireRole(["admin", "instructor"])
  const admin = createAdminClient()
  const id = (formData.get("id") as string) || null
  const courseId = formData.get("course_id") as string
  const title = (formData.get("title") as string)?.trim()
  const position = parseInt(formData.get("position") as string) || 0

  if (!courseId) return { error: "course_id required" }
  if (!title) return { error: "Module title is required" }

  const payload = { course_id: courseId, title, position }
  const query = id
    ? admin.from("modules").update(payload).eq("id", id)
    : admin.from("modules").insert(payload)
  const { error } = await query
  if (error) return { error: error.message }
  revalidatePath("/admin/content")
  return { success: true }
}

export async function deleteModule(moduleId: string) {
  await requireRole(["admin", "instructor"])
  const admin = createAdminClient()
  const { error } = await admin.from("modules").delete().eq("id", moduleId)
  if (error) return { error: error.message }
  revalidatePath("/admin/content")
  return { success: true }
}

export async function upsertLesson(formData: FormData) {
  await requireRole(["admin", "instructor"])
  const admin = createAdminClient()
  const id = (formData.get("id") as string) || null
  const moduleId = formData.get("module_id") as string
  const title = (formData.get("title") as string)?.trim()
  const payload = {
    module_id: moduleId,
    title,
    content: (formData.get("content") as string)?.trim() || null,
    video_url: (formData.get("video_url") as string)?.trim() || null,
    duration_minutes: parseInt(formData.get("duration_minutes") as string) || 0,
    position: parseInt(formData.get("position") as string) || 0,
  }

  if (!moduleId) return { error: "module_id required" }
  if (!title) return { error: "Lesson title is required" }

  const query = id
    ? admin.from("lessons").update(payload).eq("id", id)
    : admin.from("lessons").insert(payload)
  const { error } = await query
  if (error) return { error: error.message }
  revalidatePath("/admin/content")
  return { success: true }
}

export async function deleteLesson(lessonId: string) {
  await requireRole(["admin", "instructor"])
  const admin = createAdminClient()
  const { error } = await admin.from("lessons").delete().eq("id", lessonId)
  if (error) return { error: error.message }
  revalidatePath("/admin/content")
  return { success: true }
}

export async function deleteTask(taskId: string) {
  await requireRole(["admin", "instructor"])
  const admin = createAdminClient()
  const { error } = await admin.from("tasks").delete().eq("id", taskId)
  if (error) return { error: error.message }
  revalidatePath("/admin/content")
  return { success: true }
}

// ----- MCQ: save all questions + options for a task in one shot -----
// Replaces ALL existing questions for the task (full overwrite).
export async function saveTaskQuestions(
  taskId: string,
  questions: Array<{
    id?: string       // undefined = new question
    question: string
    position: number
    options: Array<{
      id?: string     // undefined = new option
      text: string
      is_correct: boolean
      position: number
    }>
  }>,
) {
  await requireRole(["admin", "instructor"])
  const admin = createAdminClient()

  // Delete existing questions (cascades to options + student_answers)
  const { error: delErr } = await admin
    .from("task_questions")
    .delete()
    .eq("task_id", taskId)
  if (delErr) return { error: delErr.message }

  // Insert questions one by one and then their options
  for (const q of questions) {
    const { data: qRow, error: qErr } = await admin
      .from("task_questions")
      .insert({ task_id: taskId, question: q.question, position: q.position })
      .select("id")
      .single()
    if (qErr) return { error: qErr.message }

    if (q.options.length > 0) {
      const { error: oErr } = await admin.from("task_options").insert(
        q.options.map((o) => ({
          question_id: (qRow as { id: string }).id,
          text: o.text,
          is_correct: o.is_correct,
          position: o.position,
        })),
      )
      if (oErr) return { error: oErr.message }
    }
  }

  revalidatePath("/admin/content")
  return { success: true }
}
