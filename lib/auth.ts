import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupabaseConfig } from '@/lib/supabase/config'
import type { Profile, Role } from '@/lib/types'

/**
 * Returns the current user's profile, or null if not authenticated.
 * Cached per-request to avoid duplicate queries across a render tree.
 *
 * Self-heals: if the user is authenticated but has no profile row (e.g. the
 * signup trigger never ran), it creates one from auth metadata using the
 * service-role client. This prevents the authenticated-but-no-profile state
 * that would otherwise cause a redirect loop with the proxy.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  if (!getSupabaseConfig()) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (data) return data as Profile

  // No profile row yet — create one from metadata (bypasses RLS via service role).
  // IMPORTANT: only insert, never update an existing row. If a row already
  // exists with a manually-set role (e.g. admin), onConflict ignore preserves it.
  try {
    const admin = createAdminClient()
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    // Insert-only: if the row already exists (e.g. admin-promoted), keep it.
    await admin.from('profiles').insert({
      id: user.id,
      full_name:
        (meta.full_name as string | undefined) ??
        user.email?.split('@')[0] ??
        'User',
      // Default to student — metadata role is only a hint for brand-new signups.
      // Admins should always be promoted explicitly, never via metadata.
      role: (meta.role as Role | undefined) ?? 'student',
      status: 'active',
    })
    // Now read back whatever is there (our insert or a pre-existing row).
    const { data: fetched } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    return (fetched as Profile) ?? null
  } catch {
    return null
  }
})

/** Requires an authenticated, non-banned profile; redirects otherwise. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) {
    if (!getSupabaseConfig()) {
      redirect(
        '/auth/login?message=Authentication%20is%20currently%20unavailable%20because%20Supabase%20is%20not%20configured.%20Please%20contact%20the%20site%20administrator.',
      )
    }
    // Authenticated users always reach here (the proxy guards unauthenticated
    // access). A missing profile means a genuine setup error, so send the user
    // to a terminal error page rather than /auth/login (which would loop).
    redirect('/auth/error')
  }
  if (profile.status === 'banned') redirect('/auth/banned')
  return profile
}

/** Requires the user to have one of the allowed roles. */
export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await requireProfile()
  if (!roles.includes(profile.role)) redirect('/dashboard')
  return profile
}
