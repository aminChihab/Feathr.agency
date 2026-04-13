'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
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
  currentStep: number
  totalSteps: number
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

    for (const [accountId, frequency] of Object.entries(schedules)) {
      if (frequency) {
        await supabase
          .from('platform_accounts')
          .update({ schedule_json: { frequency } })
          .eq('id', accountId)
      }
    }

    for (let i = 0; i < ASSISTANT_NAMES.length; i++) {
      setLaunchStep(i + 1)
      await new Promise((resolve) => setTimeout(resolve, 800))
    }

    await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (launching) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-tertiary/5 rounded-full blur-[120px]" />
        </div>
        <div className="z-10 text-center space-y-8 max-w-md">
          <h1 className="text-5xl md:text-7xl font-display italic tracking-tight leading-tight">
            Setting up your Atelier...
          </h1>
          <div className="space-y-3 text-left">
            {ASSISTANT_NAMES.map((name, i) => (
              <div
                key={name}
                className={`flex items-center gap-3 transition-opacity duration-500 ${
                  i < launchStep ? 'opacity-100' : 'opacity-20'
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${i < launchStep ? 'text-tertiary' : 'text-on-surface-variant/60'}`}
                  style={i < launchStep ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {i < launchStep ? 'check_circle' : 'circle'}
                </span>
                <span className="text-sm text-on-surface">{name}</span>
              </div>
            ))}
          </div>
          {launchStep >= ASSISTANT_NAMES.length && (
            <p className="text-primary animate-pulse font-display italic text-xl">All set! Redirecting to your dashboard...</p>
          )}
        </div>
      </main>
    )
  }

  const schedulableAccounts = accounts.filter(
    (a) => a.platforms?.category !== 'communication'
  )

  const connectedPlatforms = accounts.map(a => ({
    name: a.platforms?.name ?? 'Unknown',
    color: a.platforms?.color ?? '#666',
  }))

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-tertiary/5 rounded-full blur-[120px]" />
      </div>

      {/* Progress Indicator */}
      <div className="mb-12 flex flex-col items-center gap-4 z-10">
        <div className="flex gap-2">
          <div className="h-1 w-6 rounded-full bg-primary/20" />
          <div className="h-1 w-6 rounded-full bg-primary/20" />
          <div className="h-1 w-6 rounded-full bg-primary/20" />
          <div className="h-1 w-6 rounded-full bg-primary/20" />
          <div className="h-1 w-6 rounded-full bg-primary/20" />
          <div className="h-1 w-6 rounded-full bg-primary/20" />
          <div className="h-1 w-6 rounded-full bg-primary/20" />
          <div className="h-1 w-12 rounded-full gradient-cta" />
        </div>
        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-primary/60">Step 8 of 8</span>
      </div>

      {/* Main Content Canvas */}
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        {/* Content Side */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-display italic tracking-tight leading-tight">
              Your Atelier is Ready.
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
              Feathr has finished weaving your brand identity into the platform. Your marketing infrastructure is synchronized and live.
            </p>
          </div>

          {/* Summary Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Connection Status */}
            <div className="bg-surface-container-low rounded-xl p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant/50">Connectivity</span>
                <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {connectedPlatforms.length > 0 ? connectedPlatforms.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 bg-surface-container-highest px-3 py-1.5 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-xs font-medium text-on-surface">{p.name}</span>
                  </div>
                )) : (
                  <span className="text-xs text-on-surface-variant/60">No platforms connected</span>
                )}
              </div>
            </div>

            {/* Configuration Status */}
            <div className="bg-surface-container-low rounded-xl p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant/50">Atelier Settings</span>
                <span className="material-symbols-outlined text-primary/60">auto_awesome</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">Brand Voice</span>
                  <span className="text-on-surface font-medium italic font-display">Editorial Modern</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">AI Frequency</span>
                  <span className="text-on-surface font-medium italic font-display">Balanced</span>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule selectors for connected accounts */}
          {schedulableAccounts.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant/50">Posting Frequency</span>
              {schedulableAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between bg-surface-container-low rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: account.platforms?.color ?? '#666' }}
                    />
                    <span className="text-sm font-medium text-on-surface">{account.platforms?.name}</span>
                  </div>
                  <Select
                    value={schedules[account.id] ?? ''}
                    onValueChange={(val) =>
                      setSchedules((prev) => ({ ...prev, [account.id]: val }))
                    }
                  >
                    <SelectTrigger className="w-36 bg-surface-container-low rounded-xl text-sm">
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
          )}

          <div className="pt-4 flex items-center gap-4">
            <button onClick={onBack} className="text-on-surface-variant hover:text-on-surface transition-colors font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Back
            </button>
            <button
              onClick={handleLaunch}
              className="gradient-cta text-on-primary px-10 py-5 rounded-lg font-semibold tracking-tight text-lg shadow-2xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-3"
            >
              Launch Dashboard
              <span className="material-symbols-outlined">north_east</span>
            </button>
          </div>
        </div>

        {/* Visual Side */}
        <div className="lg:col-span-5 relative hidden lg:block">
          <div className="aspect-[4/5] rounded-full overflow-hidden glass-panel p-2 shadow-2xl">
            <div className="w-full h-full rounded-full overflow-hidden relative">
              <img
                alt="Conceptual branding visual"
                className="w-full h-full object-cover grayscale opacity-60 mix-blend-screen"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiZdTkqWXp1Q39t__an07x3W6ZPRLyn8io_hkSbpI-1QRnj9DdHYsbd5I-VG2Ki_tpZ8pFMb-FsKPBVa64HnaZqnY4JdEsL_kg4LOF0BoAOpTe46nc1G3YX4mjDFwDyi_w9iSKAnhXEZtwp_NLyjtnZjuCSEy-gUfXDoWR9CkYlx3XzGr6jwV6spbY39R-LkIYLn99iSAnLQYtvV9hXBvUzZ5gd5fzANxE_9ll6TvmtUWAfZmM2in5k2qmjH3h9Xy_MDNYTXgu3-Ku"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>

            {/* Floating UI Elements */}
            <div className="absolute top-1/4 -left-8 glass-panel border border-outline-variant/10 p-4 rounded-xl shadow-2xl max-w-[160px]">
              <span className="text-[10px] block text-primary font-bold uppercase tracking-widest mb-2">Live Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <span className="text-xs font-medium text-on-surface">Systems Active</span>
              </div>
            </div>
            <div className="absolute bottom-1/4 -right-4 glass-panel border border-outline-variant/10 p-4 rounded-xl shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold font-display italic">Premiere Tier</span>
                  <span className="text-[10px] text-on-surface-variant">Account Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Identity */}
      <footer className="mt-auto pt-12 pb-8 flex flex-col items-center gap-2 z-10">
        <span className="font-display italic text-2xl text-primary tracking-tight">Feathr</span>
        <span className="text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/40 font-medium">Marketing Atelier &copy; 2024</span>
      </footer>
    </main>
  )
}
