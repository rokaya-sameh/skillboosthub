"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"

export async function joinGroup(groupId: string) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { error } = await supabase
    .from("study_group_members")
    .insert({ group_id: groupId, student_id: profile.id })
  if (error && !error.message.includes("duplicate")) return { error: error.message }
  revalidatePath("/study-groups")
  revalidatePath(`/study-groups/${groupId}`)
  return { success: true }
}

export async function markAttendance(groupId: string) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { error } = await supabase.from("group_attendance").insert({
    group_id: groupId,
    student_id: profile.id,
    session_date: new Date().toISOString().slice(0, 10),
  })
  if (error && !error.message.includes("duplicate")) return { error: error.message }
  revalidatePath(`/study-groups/${groupId}`)
  return { success: true }
}

export async function uploadNote(formData: FormData) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const groupId = formData.get("group_id") as string
  const title = (formData.get("title") as string)?.trim()
  const fileUrl = formData.get("file_url") as string

  if (!title || !fileUrl) return { error: "Title and file are required" }

  const { error } = await supabase.from("group_notes").insert({
    group_id: groupId,
    student_id: profile.id,
    title,
    file_url: fileUrl,
  })
  if (error) return { error: error.message }
  revalidatePath(`/study-groups/${groupId}`)
  return { success: true }
}
