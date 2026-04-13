'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface VoiceProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
}

export function Voice({ userId, supabase, onNext, onBack }: VoiceProps) {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-on-surface">
          Define Your <em className="serif-italic">Voice</em>
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Describe how you communicate with clients. This is how your AI-written content and messages will sound.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-status-failed/10 px-4 py-3 text-sm text-status-failed">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="voice">Voice description</Label>
        <Textarea
          id="voice"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="bg-surface-container-low rounded-xl"
          placeholder="I'm warm and flirty but always professional. I use lots of emojis and address clients with 'babe' or 'love'. I'm direct about my boundaries but never rude."
        />
        <p className="text-sm text-on-surface-variant/60">
          2-3 sentences is perfect. The more specific, the better your content will sound.
        </p>
      </div>

      <div className="bg-surface-container-low rounded-xl p-4">
        <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2">Training Insight</p>
        <p className="text-sm text-on-surface-variant">
          Your voice description helps our AI match your unique communication style across all platforms.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          onClick={handleNext}
          disabled={!description.trim() || loading}
          className="gradient-cta text-white disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
