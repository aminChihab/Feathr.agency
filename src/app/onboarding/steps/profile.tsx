'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
}

const GOALS = [
  { value: 'more_bookings', label: 'Get more bookings' },
  { value: 'grow_online', label: 'Grow my online presence' },
  { value: 'build_onlyfans', label: 'Build my OnlyFans' },
  { value: 'go_independent', label: 'Go independent' },
  { value: 'manage_platforms', label: 'Manage multiple platforms efficiently' },
]

export function Profile({ userId, supabase, onNext, onBack }: ProfileProps) {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-on-surface">
          The foundation of your <em className="serif-italic">digital atelier.</em>
        </h1>
        <p className="mt-2 text-on-surface-variant">Tell us the basics about your work.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-status-failed/10 px-4 py-3 text-sm text-status-failed">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Professional name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Eva Hunter"
            className="bg-surface-container-low rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Amsterdam"
            className="bg-surface-container-low rounded-xl"
          />
        </div>

        <div className="space-y-3">
          <Label>What are your goals?</Label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((goal) => (
              <button
                key={goal.value}
                onClick={() => toggleGoal(goal.value)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  goals.includes(goal.value)
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {goal.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          onClick={handleNext}
          disabled={!isValid || loading}
          className="gradient-cta text-white disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
