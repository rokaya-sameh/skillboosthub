import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig } from '@/lib/supabase/config'

const PUBLIC_PATHS = ['/auth', '/manifest.webmanifest', '/sw.js', '/offline']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const config = getSupabaseConfig()
  if (!config) {
    return supabaseResponse
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Not logged in and trying to reach a protected route → send to login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Logged in and visiting an auth ENTRY page → send to dashboard.
  // Terminal pages (callback, error, banned) stay reachable to avoid loops.
  const AUTH_ENTRY_PATHS = ['/auth/login', '/auth/sign-up', '/auth/sign-up-success']
  if (user && AUTH_ENTRY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
