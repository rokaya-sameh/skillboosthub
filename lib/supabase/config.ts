export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !publishableKey) {
    return null
  }

  return { url, key: publishableKey }
}

export function assertSupabaseConfig() {
  const config = getSupabaseConfig()

  if (!config) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  return config
}

const unavailableMessage =
  'Authentication is currently unavailable because Supabase is not configured. Please contact the site administrator.'

export function createSupabaseFallbackClient() {
  const unavailableError = { message: unavailableMessage }

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: unavailableError }),
      getSession: async () => ({ data: { session: null }, error: unavailableError }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: unavailableError,
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: unavailableError,
      }),
      signOut: async () => ({ error: unavailableError }),
      exchangeCodeForSession: async () => ({ error: unavailableError }),
      resetPasswordForEmail: async () => ({ data: { user: null }, error: unavailableError }),
      updateUser: async () => ({ data: { user: null }, error: unavailableError }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
        }),
      }),
      insert: async () => ({ data: null, error: null }),
    }),
  }
}
