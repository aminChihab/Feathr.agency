'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'

type Platform = Database['public']['Tables']['platforms']['Row']

interface SelectPlatformsProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
  selectedPlatforms: string[]
  setSelectedPlatforms: (platforms: string[]) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  social: 'Social Media',
  content_income: 'Content & Income',
  directory: 'Directories',
  communication: 'Communication',
}

const CATEGORY_ORDER = ['social', 'content_income', 'directory', 'communication']

export function SelectPlatforms({
  supabase,
  onNext,
  onBack,
  selectedPlatforms,
  setSelectedPlatforms,
}: SelectPlatformsProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('name')

      setPlatforms(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function togglePlatform(id: string) {
    setSelectedPlatforms(
      selectedPlatforms.includes(id)
        ? selectedPlatforms.filter((p) => p !== id)
        : [...selectedPlatforms, id]
    )
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    platforms: platforms.filter((p) => p.category === cat),
  })).filter((g) => g.platforms.length > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="font-display text-4xl text-on-surface">Choose your channels</h1>
        <p className="mt-2 text-on-surface-variant">
          Select the platforms you want Feathr to manage for you. You can always add more later.
        </p>
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.category} className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              {group.label}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {group.platforms.map((platform) => {
                const selected = selectedPlatforms.includes(platform.id)
                const capabilities = (platform.capabilities as string[]) ?? []

                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl p-6 text-center transition-colors ${
                      selected
                        ? 'border-2 border-primary bg-surface-container-high'
                        : 'bg-surface-container-high hover:bg-surface-container-high/80'
                    }`}
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: platform.color ?? '#666' }}
                    />
                    <p className="text-sm font-medium text-on-surface">{platform.name}</p>
                    <p className="text-xs text-on-surface-variant/60">
                      {capabilities.join(' · ')}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-on-surface-variant">
            {selectedPlatforms.length} selected
          </span>
          <Button
            onClick={onNext}
            disabled={selectedPlatforms.length === 0}
            className="gradient-cta text-white disabled:opacity-50"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
