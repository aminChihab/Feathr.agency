'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
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

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="bg-surface-container-low rounded-xl p-12 w-full max-w-md">
      {/* Brand */}
      <div className="text-center">
        <h1 className="font-display text-3xl italic text-primary">Feathr</h1>
        <p className="font-body text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/40 mt-1">
          Marketing Atelier
        </p>
      </div>

      {/* Heading */}
      <div className="mt-8">
        <h2 className="font-display text-xl text-on-surface">Welcome back</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Please enter your credentials to access your atelier.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="bg-error-container/20 text-error text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs uppercase tracking-wider text-on-surface-variant mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-transparent border-0 border-b-2 border-surface-variant focus:border-primary focus:ring-0 text-on-surface placeholder:text-on-surface-variant/20 py-3 transition-all duration-300 outline-none"
            placeholder="name@atelier.com"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <label htmlFor="password" className="block text-xs uppercase tracking-wider text-on-surface-variant">
              Password
            </label>
            <Link href="#" className="text-primary text-xs uppercase tracking-wider hover:opacity-70 transition-opacity">
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-transparent border-0 border-b-2 border-surface-variant focus:border-primary focus:ring-0 text-on-surface placeholder:text-on-surface-variant/20 py-3 transition-all duration-300 outline-none"
            placeholder="••••••••"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full gradient-cta mt-2 py-4 text-on-primary font-semibold text-sm tracking-wide rounded-lg hover:shadow-xl hover:shadow-primary/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Enter Dashboard'}
        </Button>
      </form>

      <div className="mt-10 text-center">
        <p className="text-sm text-on-surface-variant">New to the atelier?</p>
        <Link href="/signup" className="text-primary text-sm mt-1 inline-block hover:opacity-70 transition-opacity">
          Request an Invitation
        </Link>
      </div>
    </div>
  )
}
