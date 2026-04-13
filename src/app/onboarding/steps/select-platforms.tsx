'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Platform = Database['public']['Tables']['platforms']['Row']

interface SelectPlatformsProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
  selectedPlatforms: string[]
  setSelectedPlatforms: (platforms: string[]) => void
  currentStep: number
  totalSteps: number
}

const PLATFORM_ICONS: Record<string, { icon: string; color: string }> = {
  'twitter': { icon: 'brand_awareness', color: '#1DA1F2' },
  'instagram': { icon: 'photo_camera', color: '#E4405F' },
  'tiktok': { icon: 'movie', color: '#00f2ea' },
  'whatsapp': { icon: 'chat', color: '#25D366' },
  'onlyfans': { icon: 'visibility', color: '#00AFF0' },
  'tryst': { icon: 'diamond', color: '#febbcb' },
  'slixa': { icon: 'style', color: '#FF4500' },
}

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Progress Header */}
      <div className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <div className="flex items-center gap-4 mb-4">
          <span className="font-display italic text-3xl text-primary tracking-tight">Feathr</span>
        </div>
        <div className="w-full max-w-xs bg-surface-container-low h-1 rounded-full overflow-hidden mb-2">
          <div className="bg-primary h-full w-[62.5%] transition-all duration-500" />
        </div>
        <p className="text-xs font-body uppercase tracking-widest text-on-surface-variant/60">Step 5 of 8</p>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl">
        <header className="text-center mb-16">
          <h1 className="font-display text-5xl md:text-6xl text-on-surface mb-4 leading-tight">Choose your channels</h1>
          <p className="text-on-surface-variant text-lg max-w-xl mx-auto">Select the platforms where you want Feathr&apos;s AI to orchestrate your brand presence and content strategy.</p>
        </header>

        {/* Platform Grid: Bento Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {platforms.map((platform) => {
            const selected = selectedPlatforms.includes(platform.id)
            const slug = platform.slug ?? platform.name.toLowerCase()
            const iconData = PLATFORM_ICONS[slug]

            return (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`group relative flex flex-col items-center justify-center p-8 rounded-xl transition-all duration-300 ${
                  selected
                    ? 'bg-surface-container-high border border-primary/30'
                    : 'bg-surface-container-low ghost-border hover:bg-surface-container-high'
                }`}
              >
                <div className={`absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center ${
                  selected
                    ? 'bg-primary'
                    : 'border-2 border-outline-variant group-hover:border-primary'
                }`}>
                  <span
                    className={`material-symbols-outlined text-[14px] ${
                      selected ? 'text-on-primary' : 'text-primary opacity-0 group-hover:opacity-100'
                    }`}
                    style={selected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    check
                  </span>
                </div>
                <div
                  className="w-12 h-12 flex items-center justify-center mb-4"
                  style={{ color: iconData?.color ?? platform.color ?? '#999' }}
                >
                  <span className="material-symbols-outlined text-4xl">{iconData?.icon ?? 'link'}</span>
                </div>
                <span className="font-body text-sm font-medium tracking-tight">{platform.name}</span>
              </button>
            )
          })}

          {/* Custom Link (Add Other) */}
          <button className="group relative flex flex-col items-center justify-center p-8 rounded-xl bg-surface-container-low/30 border border-dashed border-outline-variant/30 hover:bg-surface-container-low transition-all duration-300">
            <div className="w-12 h-12 flex items-center justify-center mb-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl">add</span>
            </div>
            <span className="font-body text-xs font-medium tracking-tight text-on-surface-variant">Add Other</span>
          </button>
        </div>

        {/* Action Area */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="text-on-surface-variant hover:text-on-surface text-sm font-body font-medium transition-colors">
              Go Back
            </button>
            <div className="w-px h-6 bg-outline-variant/20" />
            <p className="text-on-surface-variant/60 text-xs font-body">{selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected for optimization</p>
          </div>
          <button
            onClick={onNext}
            disabled={selectedPlatforms.length === 0}
            className="gradient-cta text-on-primary font-body font-semibold py-4 px-12 rounded-lg text-sm shadow-xl shadow-primary/10 hover:shadow-primary/20 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            Continue to Analytics Setup
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Decorative Background Elements */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10 pointer-events-none" />

      {/* Visual Footer */}
      <footer className="w-full py-8 px-10 border-t border-outline-variant/10 mt-16">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40 font-body">
          <span>&copy; 2024 Feathr Marketing Atelier</span>
          <div className="flex gap-8">
            <span>Privacy Ethics</span>
            <span>Security Protocol</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
