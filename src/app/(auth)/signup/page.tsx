'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-light tracking-tight">Feathr</h1>
        <p className="mt-2 text-text-secondary">Start je AI marketing agency</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-status-failed/10 px-4 py-3 text-sm text-status-failed">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-text-secondary">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="je@email.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-text-secondary">Wachtwoord</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Minimaal 6 tekens"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-accent text-white hover:bg-accent-hover disabled:opacity-50">
          {loading ? 'Bezig...' : 'Account aanmaken'}
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Al een account?{' '}
        <Link href="/login" className="text-accent hover:text-accent-hover">Inloggen</Link>
      </p>
    </div>
  )
}
