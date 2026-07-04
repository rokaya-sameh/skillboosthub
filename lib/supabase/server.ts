import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseFallbackClient, getSupabaseConfig } from '@/lib/supabase/config'

/**
 * Always create a new client within each function (important for Fluid compute).
 */
export async function createClient() {
  const cookieStore = await cookies()
  const config = getSupabaseConfig()

  if (!config) {
    return createSupabaseFallbackClient() as ReturnType<typeof createServerClient>
  }

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component — safe to ignore when proxy refreshes sessions.
        }
      },
    },
  })
}
