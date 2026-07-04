'use client'

import { createClient } from '@/lib/supabase/client'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useState, useTransition } from 'react'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const authUnavailableMessage =
    'Authentication is currently unavailable because Supabase is not configured. Please contact the site administrator.'
  const isAuthUnavailable = !getSupabaseConfig()
  const messageParam = searchParams.get('message')
  const bannerMessage = error ?? messageParam ?? (isAuthUnavailable ? authUnavailableMessage : null)

  const handleLogin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (isAuthUnavailable) {
        setError(authUnavailableMessage)
        return
      }

      startTransition(async () => {
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setError(error.message)
          return
        }
        router.push('/dashboard')
        router.refresh()
      })
    },
    [email, password, router],
  )

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your SkillBoost account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {bannerMessage && (
            <div
              className={`rounded-md border p-3 text-sm ${isAuthUnavailable ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}
            >
              {bannerMessage}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link href="/auth/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm text-center text-sm text-muted-foreground">Loading…</div>}>
      <LoginContent />
    </Suspense>
  )
}
