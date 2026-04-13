'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface ProfileProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
  currentStep: number
  totalSteps: number
}

const GOALS = [
  { value: 'more_bookings', label: 'get more bookings' },
  { value: 'grow_online', label: 'grow online presence' },
  { value: 'build_onlyfans', label: 'build OnlyFans' },
  { value: 'go_independent', label: 'go independent' },
  { value: 'manage_platforms', label: 'manage multiple platforms', wide: true },
]

export function Profile({ userId, supabase, onNext, onBack, currentStep, totalSteps }: ProfileProps) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    )
  }

  async function handleNext() {
    if (!name.trim() || !city.trim() || goals.length === 0) return

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        professional_name: name.trim(),
        city: city.trim(),
        goals: goals,
      })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    onNext()
  }

  const isValid = name.trim() && city.trim() && goals.length > 0
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <>
      {/* Top Navigation */}
      <header className="flex justify-between items-center h-20 px-6 md:px-12 sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors group">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="text-sm font-medium tracking-tight">Back</span>
          </button>
        </div>
        <div className="font-display text-2xl italic text-primary">Feathr</div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-on-surface-variant uppercase">Step 02</span>
          <span className="text-xs font-medium text-on-surface-variant/40">/ 08</span>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-7xl mx-auto w-full">
        {/* Progress Bar */}
        <div className="w-full max-w-xl mb-16 px-4">
          <div className="h-[2px] w-full bg-surface-container-highest relative">
            <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {error && (
          <div className="w-full max-w-4xl mb-8 rounded-lg bg-error-container/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          {/* Left Column: Editorial Context */}
          <div className="lg:col-span-5 space-y-6">
            <h1 className="font-display text-5xl md:text-6xl text-on-surface leading-tight tracking-tight">
              The foundation of your <span className="italic text-primary">digital atelier.</span>
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
              Tell us how you&apos;d like to be presented to the world. These details help us curate the right platforms and tools for your career.
            </p>
            <div className="pt-8 hidden lg:block">
              <div className="p-1 bg-surface-container-low rounded-xl inline-block overflow-hidden">
                <img
                  alt="Professional portrait"
                  className="w-64 h-80 object-cover rounded-lg grayscale hover:grayscale-0 transition-all duration-700 opacity-60"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOUQ72Qkgj-Pa3L87-NYuvlX3xSA9cJE6VN-eN616M1s4ZhHuBbS9NflM-dfSqElUIucPV9c0wTmokOm6ySoUxnhmP42KGED2wZPLldUok1Fd7UndBQJVkFCIqRBixx4AH8mzndNXzg5aryV0WUmAfIRJLkP_NmwR7LF_fU9zmTcurOAa4Opni66ILidzvN894M00VsYuoF1Fmdooq-mPJFjUNQZZm_cv0SfaWaH1fSG-MKFNRph9nFY-2tT2hG50YtddGOMWTPTps"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7 w-full">
            <form className="space-y-12" onSubmit={(e) => { e.preventDefault(); handleNext() }}>
              {/* Text Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 group">
                  <label className="text-xs font-semibold tracking-widest text-on-surface-variant uppercase ml-1">Professional Name</label>
                  <input
                    className="w-full bg-transparent border-0 border-b-2 border-surface-variant focus:ring-0 focus:border-primary text-xl py-4 transition-all duration-300 placeholder:text-on-surface-variant/20 text-on-surface"
                    placeholder="e.g. Jordan Rivers"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2 group">
                  <label className="text-xs font-semibold tracking-widest text-on-surface-variant uppercase ml-1">City</label>
                  <input
                    className="w-full bg-transparent border-0 border-b-2 border-surface-variant focus:ring-0 focus:border-primary text-xl py-4 transition-all duration-300 placeholder:text-on-surface-variant/20 text-on-surface"
                    placeholder="e.g. New York, NY"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              {/* Career Goals (Bento-style checkboxes) */}
              <div className="space-y-6">
                <label className="text-xs font-semibold tracking-widest text-on-surface-variant uppercase ml-1 block">What are your primary career goals?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {GOALS.map((goal) => {
                    const selected = goals.includes(goal.value)
                    return (
                      <label key={goal.value} className={`relative group cursor-pointer ${goal.wide ? 'md:col-span-2' : ''}`}>
                        <input
                          className="peer sr-only"
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleGoal(goal.value)}
                        />
                        <div className={`p-6 rounded-xl border transition-all duration-200 ${
                          selected
                            ? 'border-primary/40 bg-surface-container-highest'
                            : 'bg-surface-container-low border-outline-variant/10 group-hover:bg-surface-container-high'
                        }`}>
                          <div className="flex justify-between items-start">
                            <span className="text-base font-medium">{goal.label}</span>
                            <span className={`material-symbols-outlined text-primary transition-opacity ${selected ? 'opacity-100' : 'opacity-0'}`}>check_circle</span>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Footer Action */}
              <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <p className="text-on-surface-variant text-sm">
                  Step 2 of 8: Profile &amp; Identity
                </p>
                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full md:w-auto gradient-cta text-on-primary font-semibold px-12 py-4 rounded-lg shadow-2xl shadow-primary/10 active:scale-95 transition-all duration-150 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Continue to Step 3'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer Decoration */}
      <footer className="py-12 px-12 flex justify-center opacity-20 select-none pointer-events-none">
        <div className="font-display italic text-8xl md:text-[12rem] text-surface-container-highest leading-none">Atelier</div>
      </footer>
    </>
  )
}
