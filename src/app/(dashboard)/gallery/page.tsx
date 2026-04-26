'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { MediaLibrary } from '@/components/studio/media-library'
import { createClient } from '@/lib/supabase/client'

export default function GalleryPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single()
      setCreditBalance(profile?.credit_balance ?? null)
    }
    init()
  }, [supabase])

  if (!userId) {
    return (
      <div>
        <PageHeader title="Gallery" subtitle="Your media collection" />
        <div className="px-4 md:px-6 py-16 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Gallery" subtitle="Your media collection" />
      <div className="px-4 md:px-6">
        <MediaLibrary
          supabase={supabase}
          userId={userId}
          creditBalance={creditBalance}
          onCreditsChanged={async () => {
            const { data } = await supabase
              .from('profiles')
              .select('credit_balance')
              .eq('id', userId)
              .single()
            setCreditBalance(data?.credit_balance ?? null)
          }}
        />
      </div>
    </div>
  )
}
