'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Plus, Minus, Sparkles } from 'lucide-react'

interface Suggestion {
  handle?: string
  tag?: string
  reason: string
}

interface DiscoveryNotification {
  id: string
  title: string
  body: {
    source: string
    platform: string
    add_accounts?: Suggestion[]
    add_hashtags?: Suggestion[]
    remove_accounts?: Suggestion[]
    remove_hashtags?: Suggestion[]
  }
}

interface ResearchSuggestionsProps {
  notifications: DiscoveryNotification[]
  onAccept: (notificationId: string, action: 'add_account' | 'add_hashtag' | 'remove_account' | 'remove_hashtag', value: string) => Promise<void>
  onDismiss: (notificationId: string) => Promise<void>
}

export function ResearchSuggestions({ notifications, onAccept, onDismiss }: ResearchSuggestionsProps) {
  const [processing, setProcessing] = useState<string | null>(null)

  if (notifications.length === 0) return null

  const sourceLabel = (source: string) => {
    if (source === 'x_strategist') return 'X/Twitter'
    if (source === 'ig_strategist') return 'Instagram'
    return source
  }

  return (
    <div className="bg-surface-container-low rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-8 py-4 border-b border-outline-variant/10">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-display text-xl">Research Suggestions</h3>
        <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest font-semibold">from your AI strategists</span>
      </div>

      <div className="divide-y divide-outline-variant/10">
        {notifications.map((notif) => {
          const b = notif.body
          const allItems = [
            ...(b.add_accounts ?? []).map((s) => ({ ...s, type: 'add_account' as const, value: s.handle!, icon: Plus })),
            ...(b.add_hashtags ?? []).map((s) => ({ ...s, type: 'add_hashtag' as const, value: s.tag!, icon: Plus })),
            ...(b.remove_accounts ?? []).map((s) => ({ ...s, type: 'remove_account' as const, value: s.handle!, icon: Minus })),
            ...(b.remove_hashtags ?? []).map((s) => ({ ...s, type: 'remove_hashtag' as const, value: s.tag!, icon: Minus })),
          ]

          return (
            <div key={notif.id} className="px-8 py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-0.5 rounded">
                    {sourceLabel(b.source)}
                  </span>
                  <span className="text-xs text-on-surface-variant/60 italic">{notif.title}</span>
                </div>
                <button
                  onClick={() => onDismiss(notif.id)}
                  className="text-[11px] text-on-surface-variant/50 hover:text-on-surface transition-colors uppercase tracking-widest"
                >
                  Dismiss all
                </button>
              </div>
              <div className="space-y-2">
                {allItems.map((item, i) => {
                  const isRemove = item.type.startsWith('remove')
                  const key = `${notif.id}-${i}`
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-container-highest/30 hover:bg-surface-container-highest transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${isRemove ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{item.value}</span>
                          <p className="text-[11px] text-on-surface-variant leading-snug truncate">{item.reason}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs shrink-0 ml-4 border-primary/20 text-primary hover:bg-primary/5"
                        disabled={processing === key}
                        onClick={async () => {
                          setProcessing(key)
                          await onAccept(notif.id, item.type, item.value)
                          setProcessing(null)
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {isRemove ? 'Remove' : 'Follow'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
