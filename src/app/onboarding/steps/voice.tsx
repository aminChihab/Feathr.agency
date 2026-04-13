'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface VoiceProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
  currentStep: number
  totalSteps: number
}

const TONE_TAGS = ['Sophisticated', 'Witty', 'Direct', 'Academic', 'Minimalist']

export function Voice({ userId, supabase, onNext, onBack, currentStep, totalSteps }: VoiceProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNext() {
    if (!description.trim()) return

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ voice_description: description.trim() })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    onNext()
  }

  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 lg:px-8">
      {/* Progress Indicator */}
      <div className="w-full max-w-3xl mb-12">
        <div className="flex justify-between items-end mb-4">
          <span className="text-primary font-display italic text-2xl">Feathr</span>
          <span className="text-on-surface-variant text-sm tracking-widest uppercase">Step 3 of 8</span>
        </div>
        <div className="h-[2px] w-full bg-surface-container-highest overflow-hidden">
          <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {error && (
        <div className="w-full max-w-3xl mb-8 rounded-lg bg-error-container/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Content Canvas */}
      <div className="w-full max-w-3xl flex flex-col lg:flex-row gap-12 items-start">
        {/* Left: Editorial Column */}
        <div className="lg:w-1/3 flex flex-col gap-6">
          <h1 className="font-display text-5xl lg:text-6xl text-on-surface leading-none tracking-tight">
            Define Your <span className="italic text-primary">Voice</span>
          </h1>
          <p className="text-on-surface-variant leading-relaxed font-body">
            Our AI models learn from your unique rhythm. Describe how you speak to clients&mdash;whether it&apos;s poetic and grand, or punchy and precise.
          </p>

          {/* Secondary Context Card */}
          <div className="mt-8 p-6 rounded-xl bg-surface-container-low outline outline-1 outline-outline-variant/15">
            <span className="material-symbols-outlined text-primary mb-4 block">auto_awesome</span>
            <h3 className="text-on-surface font-semibold text-sm mb-2">Training Insight</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              The more specific you are about your communication style, the more authentic your generated content will feel.
            </p>
          </div>
        </div>

        {/* Right: Interactive Input Space */}
        <div className="lg:w-2/3 w-full flex flex-col gap-8">
          <div className="relative">
            <textarea
              className="w-full h-64 bg-transparent border-0 border-b-2 border-surface-variant text-on-surface text-lg leading-relaxed resize-none p-0 transition-colors duration-300 focus:border-primary focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/30"
              id="voice-description"
              placeholder="I tend to use architectural metaphors. My tone is warm but authoritative, avoiding industry jargon in favor of evocative, sensory descriptions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 mt-6">
              {TONE_TAGS.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-surface-container-highest text-xs text-on-surface-variant border border-outline-variant/10">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-12 pt-8 border-t border-outline-variant/10">
            <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span className="text-sm font-body uppercase tracking-widest">Back</span>
            </button>
            <button
              onClick={handleNext}
              disabled={!description.trim() || loading}
              className="gradient-cta px-10 py-4 rounded-xl text-on-primary font-semibold text-sm flex items-center gap-3 hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-primary/10 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Continue to Step 4'}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Background Elements */}
      <div className="fixed bottom-0 right-0 w-1/3 h-1/2 opacity-20 pointer-events-none -z-10 bg-gradient-to-tl from-primary-container/20 to-transparent blur-3xl" />
      <div className="fixed top-0 left-0 w-1/4 h-1/3 opacity-10 pointer-events-none -z-10 bg-gradient-to-br from-tertiary/20 to-transparent blur-3xl" />

      {/* Visual Anchor Image */}
      <div className="hidden lg:block fixed bottom-12 left-12 w-48 h-64 grayscale opacity-40 hover:opacity-100 transition-opacity duration-700">
        <img
          alt="Editorial Still Life"
          className="w-full h-full object-cover rounded-xl shadow-2xl"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsB7lFROyRQnMAaaO1ye5nQScbbatBn3gOX0XjWVUyHpz0V_Usm7EnYHKH0Th9_pihsMh_lJ_iOCXeEHsUDLvwcKuIlL13xu1GrDZYjBbT5YPlK3witJFvfBkwpu5LSLc_-CBSQ6sXVs3VICrZG1FmGKhKHEj2Q6xiB2-UXLf9Vgnh_SzmyAO7bFLNw82C4JyZsSqqh4m7hCfh2nkWR9pl85pDTeK2exlG1VVscVhO7_ci71vmKnVyXb0cI_rG9OM31-axUBBbfbrQ"
        />
      </div>
    </main>
  )
}
