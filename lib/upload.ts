import { createClient } from '@/lib/supabase/client'

/**
 * Uploads a file to a Supabase Storage bucket and returns a usable URL.
 * - `avatars` is a public bucket → returns a public URL.
 * - `uploads` is private → returns a signed URL (valid ~1 year) for online access.
 */
export async function uploadFile(
  bucket: 'avatars' | 'uploads',
  folder: string,
  file: File,
): Promise<string> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  if (bucket === 'avatars') {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }
  const { data, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  if (signErr) throw signErr
  return data.signedUrl
}
