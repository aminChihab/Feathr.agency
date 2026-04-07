'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PlatformAccount = Database['public']['Tables']['platform_accounts']['Row'] & {
  platforms: Database['public']['Tables']['platforms']['Row']
}

interface LaunchProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '2x_daily', label: '2x per day' },
  { value: '3x_weekly', label: '3x per week' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
]

const DEFAULT_FREQUENCY: Record<string, string> = {
  social: 'daily',
  content_income: '2x_daily',
  directory: 'weekly',
  communication: '',
}

const ASSISTANT_NAMES = [
  'Researcher',
  'Strategist',
  'Content Writer',
  'Ad Optimizer',
  'Lead Qualifier',
  'Content Poster',
  'Profile Syncer',
  'Inbox Manager',
  'Analytics Tracker',
]

export function Launch({ userId, supabase, onBack }: LaunchProps) {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [schedules, setSchedules] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [launchStep, setLaunchStep] = useState(0)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('platform_accounts')
        .select('*, platforms(*)')
        .eq('profile_id', userId)
        .eq('status', 'connected')

      const typedData = (data ?? []) as unknown as PlatformAccount[]
      setAccounts(typedData)

      // Set defaults
      const defaults: Record<string, string> = {}
      for (const account of typedData) {
        const category = account.platforms?.category ?? 'social'
        if (category !== 'communication') {
          defaults[account.id] = DEFAULT_FREQUENCY[category] ?? 'daily'
        }
      }
      setSchedules(defaults)
      setLoading(false)
    }
    load()
  }, [])

  async function handleLaunch() {
    setLaunching(true)

    // Save schedules
    for (const [accountId, frequency] of Object.entries(schedules)) {
      if (frequency) {
        await supabase
          .from('platform_accounts')
          .update({ schedule_json: { frequency } })
          .eq('id', accountId)
      }
    }

    // Animated launch sequence
    for (let i = 0; i < ASSISTANT_NAMES.length; i++) {
      setLaunchStep(i + 1)
      await new Promise((resolve) => setTimeout(resolve, 800))
    }

    // Set profile active
    await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId)

    // Brief pause to show completion
    await new Promise((resolve) => setTimeout(resolve, 1000))

    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (launching) {
    return (
      <div className="space-y-8 text-center py-8">
        <h1 className="text-3xl font-light tracking-tight">Setting up your assistants...</h1>
        <div className="space-y-3 text-left max-w-sm mx-auto">
          {ASSISTANT_NAMES.map((name, i) => (
            <div
              key={name}
              className={`flex items-center gap-3 transition-opacity duration-500 ${
                i < launchStep ? 'opacity-100' : 'opacity-20'
              }`}
            >
              <span className={`text-sm ${i < launchStep ? 'text-status-scheduled' : 'text-text-muted'}`}>
                {i < launchStep ? '✓' : '○'}
              </span>
              <span className="text-sm">{name}</span>
            </div>
          ))}
        </div>
        {launchStep >= ASSISTANT_NAMES.length && (
          <p className="text-accent animate-pulse">All set! Redirecting to your dashboard...</p>
        )}
      </div>
    )
  }

  const schedulableAccounts = accounts.filter(
    (a) => a.platforms?.category !== 'communication'
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Set your schedule & launch</h1>
        <p className="mt-2 text-text-secondary">
          Choose how often Feathr posts on each platform. You can adjust this anytime.
        </p>
      </div>

      {schedulableAccounts.length > 0 ? (
        <div className="space-y-4">
          {schedulableAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: account.platforms?.color ?? '#666' }}
                />
                <span className="text-sm font-medium">{account.platforms?.name}</span>
              </div>
              <Select
                value={schedules[account.id] ?? ''}
                onValueChange={(val) =>
                  setSchedules((prev) => ({ ...prev, [account.id]: val }))
                }
              >
                <SelectTrigger className="w-40 bg-bg-surface">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-text-muted">
          No platforms connected yet. You can set schedules later in Settings.
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          onClick={handleLaunch}
          className="bg-accent px-8 text-white hover:bg-accent-hover"
          size="lg"
        >
          Launch your agency
        </Button>
      </div>
    </div>
  )
}
