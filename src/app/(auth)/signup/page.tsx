'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
      <>
        {/* Brand Identity */}
        <div className="text-center mb-12">
          <h1 className="font-display text-6xl italic text-primary tracking-tight mb-2 select-none">
            Feathr
          </h1>
          <p className="text-on-surface-variant font-body text-sm tracking-[0.2em] uppercase opacity-60">
            Marketing Atelier
          </p>
        </div>

        {/* Confirmation Card */}
        <section className="glass-panel rounded-full p-10 shadow-2xl border border-outline-variant/10 text-center space-y-4">
          <div className="mb-4">
            <span className="material-symbols-outlined text-primary text-4xl">mark_email_read</span>
          </div>
          <h2 className="font-display text-3xl text-on-surface">Check your email</h2>
          <p className="text-on-surface-variant text-sm">
            We sent a confirmation link to{' '}
            <span className="text-on-surface">{email}</span>.
            Click the link to activate your account.
          </p>
          <p className="text-on-surface-variant/60 text-xs pt-2">
            No email received? Check your spam folder.
          </p>
        </section>
      </>
    )
  }

  return (
    <>
      {/* Brand Identity */}
      <div className="text-center mb-12">
        <h1 className="font-display text-6xl italic text-primary tracking-tight mb-2 select-none">
          Feathr
        </h1>
        <p className="text-on-surface-variant font-body text-sm tracking-[0.2em] uppercase opacity-60">
          Marketing Atelier
        </p>
      </div>

      {/* Authentication Card */}
      <section className="glass-panel rounded-full p-10 shadow-2xl border border-outline-variant/10">
        <header className="mb-8">
          <h2 className="font-display text-3xl text-on-surface mb-1">Create your account</h2>
          <p className="text-on-surface-variant text-sm">
            Start your AI marketing atelier.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-container/20 text-error text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Email Field */}
          <div className="group">
            <label
              className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
              htmlFor="email"
            >
              Work Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-lg">
                mail
              </span>
              <input
                className="w-full bg-transparent border-0 border-b-2 border-surface-variant focus:border-primary focus:ring-0 text-on-surface placeholder:text-on-surface-variant/20 py-3 pl-8 transition-all duration-300 outline-none"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@atelier.com"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="group">
            <label
              className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-lg">
                lock
              </span>
              <input
                className="w-full bg-transparent border-0 border-b-2 border-surface-variant focus:border-primary focus:ring-0 text-on-surface placeholder:text-on-surface-variant/20 py-3 pl-8 transition-all duration-300 outline-none"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            className="w-full mt-8 py-4 gradient-cta text-on-primary font-semibold text-sm tracking-wide rounded-lg hover:shadow-xl hover:shadow-primary/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <footer className="mt-10 text-center">
          <p className="text-on-surface-variant text-xs mb-4">Already have an account?</p>
          <Link
            href="/login"
            className="text-on-surface font-semibold text-sm border-b border-outline-variant/30 hover:border-primary transition-colors pb-0.5"
          >
            Sign in
          </Link>
        </footer>
      </section>

      {/* Trust Indicator */}
      <div className="mt-12 flex justify-center items-center gap-8 opacity-30 grayscale transition-all duration-500 hover:opacity-60 hover:grayscale-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">verified_user</span>
          <span className="text-[10px] uppercase tracking-tighter">Secure Vault</span>
        </div>
        <div className="w-px h-3 bg-outline-variant" />
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">encrypted</span>
          <span className="text-[10px] uppercase tracking-tighter">AES-256</span>
        </div>
      </div>
    </>
  )
}
