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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Choose your platforms</h1>
        <p className="mt-2 text-text-secondary">
          Select the platforms you want Feathr to manage for you. You can always add more later.
        </p>
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.category} className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
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
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:bg-bg-surface'
                    }`}
                  >
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: platform.color ?? '#666' }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{platform.name}</p>
                      <p className="text-xs text-text-muted">
                        {capabilities.join(' · ')}
                      </p>
                    </div>
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
          <span className="text-sm text-text-muted">
            {selectedPlatforms.length} selected
          </span>
          <Button
            onClick={onNext}
            disabled={selectedPlatforms.length === 0}
            className="bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
