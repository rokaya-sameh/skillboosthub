"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function sendMessage(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const recipientId = formData.get("recipient_id") as string;
  const body = (formData.get("body") as string)?.trim();
  const courseId = (formData.get("course_id") as string) || null;
  const fileUrl = (formData.get("file_url") as string) || null;

  if (!recipientId || (!body && !fileUrl)) return { error: "Message is empty" };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: profile.id,
      recipient_id: recipientId,
      course_id: courseId,
      body: body || "",
      file_url: fileUrl,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/messages");
  return { success: true, message: data };
}

export async function markThreadRead(otherId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("recipient_id", profile.id)
    .eq("sender_id", otherId)
    .eq("read", false);
  revalidatePath("/messages");
}
