import { createBrowserClient } from '@supabase/ssr'
import { createSupabaseFallbackClient, getSupabaseConfig } from '@/lib/supabase/config'

export function createClient() {
  const config = getSupabaseConfig()

  if (!config) {
    return createSupabaseFallbackClient() as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(config.url, config.anonKey)
}
