"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"

export async function gradeSubmission(formData: FormData) {
  const profile = await requireRole(["instructor", "admin"])
  const supabase = await createClient()
  const submissionId = formData.get("submission_id") as string
  const grade = Number(formData.get("grade"))
  const feedback = (formData.get("feedback") as string)?.trim() || null
  const returnForRevision = formData.get("return") === "true"

  if (Number.isNaN(grade)) return { error: "Grade must be a number" }

  const { error } = await supabase
    .from("submissions")
    .update({
      grade,
      feedback,
      status: returnForRevision ? "returned" : "graded",
      graded_by: profile.id,
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId)

  if (error) return { error: error.message }
  revalidatePath("/students")
  revalidatePath("/grading")
  return { success: true }
}

export async function saveCapstoneEvaluation(formData: FormData) {
  const profile = await requireRole(["instructor", "admin"])
  const supabase = await createClient()

  const studentId = formData.get("student_id") as string
  const courseId = (formData.get("course_id") as string) || null
  const title = (formData.get("title") as string)?.trim() || "Capstone"
  const score = Number(formData.get("score"))
  const feedback = (formData.get("feedback") as string)?.trim() || null

  if (Number.isNaN(score) || score < 0 || score > 100) {
    return { error: "Score must be between 0 and 100" }
  }

  // Convert a 0-100 score to a 4.0 GPA scale.
  const gpa = Math.round((score / 100) * 4 * 100) / 100

  const { error } = await supabase.from("capstone_evaluations").insert({
    student_id: studentId,
    course_id: courseId,
    title,
    score,
    gpa,
    feedback,
    evaluator_id: profile.id,
  })
  if (error) return { error: error.message }

  // Recompute the student's cumulative GPA as the average of all evaluations.
  const { data: evals } = await supabase
    .from("capstone_evaluations")
    .select("gpa")
    .eq("student_id", studentId)
  const gpas = (evals ?? []).map((e) => e.gpa as number).filter((g) => g != null)
  const avg = gpas.length ? Math.round((gpas.reduce((a, b) => a + b, 0) / gpas.length) * 100) / 100 : gpa
  await supabase.from("profiles").update({ gpa: avg }).eq("id", studentId)

  revalidatePath("/students")
  revalidatePath(`/students/${studentId}`)
  return { success: true, gpa }
}
