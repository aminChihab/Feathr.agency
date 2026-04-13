'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
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

    setEmailSent(true)
    setLoading(false)
  }

  if (emailSent) {
    return (
      <div className="bg-surface-container-low rounded-xl p-12 w-full max-w-md text-center space-y-6">
        <h1 className="font-display text-3xl italic text-primary">Feathr</h1>
        <p className="font-body text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/40">
          Marketing Atelier
        </p>
        <h2 className="font-display text-xl text-on-surface mt-8">Check your email</h2>
        <p className="text-sm text-on-surface-variant">
          We sent a confirmation link to <span className="text-on-surface">{email}</span>.
          Click the link to activate your account.
        </p>
        <p className="text-xs text-on-surface-variant/60">
          No email received? Check your spam folder.
        </p>
      </div>
    )
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
        <h2 className="font-display text-xl text-on-surface">Create your account</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Start your AI marketing atelier.
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
          <label htmlFor="password" className="block text-xs uppercase tracking-wider text-on-surface-variant mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-transparent border-0 border-b-2 border-surface-variant focus:border-primary focus:ring-0 text-on-surface placeholder:text-on-surface-variant/20 py-3 transition-all duration-300 outline-none"
            placeholder="Minimum 6 characters"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full gradient-cta mt-2 py-4 text-on-primary font-semibold text-sm tracking-wide rounded-lg hover:shadow-xl hover:shadow-primary/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-10 text-center">
        <p className="text-sm text-on-surface-variant">Already have an account?</p>
        <Link href="/login" className="text-primary text-sm mt-1 inline-block hover:opacity-70 transition-opacity">
          Sign in
        </Link>
      </div>
    </div>
  )
}
