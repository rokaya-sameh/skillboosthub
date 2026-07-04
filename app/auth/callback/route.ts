import { getSupabaseConfig } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!getSupabaseConfig()) {
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set(
      'message',
      'Authentication is currently unavailable because Supabase is not configured. Please contact the site administrator.',
    )
    return NextResponse.redirect(loginUrl.toString())
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  const loginUrl = new URL('/auth/login', origin)
  loginUrl.searchParams.set('message', 'We could not complete the sign-in. Please try again.')
  return NextResponse.redirect(loginUrl.toString())
}
