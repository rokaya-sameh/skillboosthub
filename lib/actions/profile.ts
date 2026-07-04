'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'

export async function updateProfile(formData: FormData) {
  const profile = await requireProfile()
  const supabase = await createClient()

  const payload = {
    full_name: (formData.get('full_name') as string)?.trim() || null,
    headline: (formData.get('headline') as string)?.trim() || null,
    bio: (formData.get('bio') as string)?.trim() || null,
    location: (formData.get('location') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    track: (formData.get('track') as string)?.trim() || null,
    cohort: (formData.get('cohort') as string)?.trim() || null,
    avatar_url: (formData.get('avatar_url') as string) || profile.avatar_url,
    resume_url: (formData.get('resume_url') as string) || profile.resume_url,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id)
  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true }
}
