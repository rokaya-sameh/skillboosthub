import { createClient } from "@supabase/supabase-js"

/**
 * Service-role client for privileged admin operations (ban, reset password,
 * cascade deletes). NEVER import this into client components — it bypasses RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !serviceKey) {
    return null as unknown as ReturnType<typeof createClient>
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
