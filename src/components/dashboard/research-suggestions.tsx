'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X, Plus, Minus, Sparkles } from 'lucide-react'

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
    <div className="rounded-xl border border-accent/20 bg-accent/5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-accent/10">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-medium">Research Suggestions</h2>
        <span className="text-xs text-text-muted">from your AI strategists</span>
      </div>

      <div className="divide-y divide-border/50">
        {notifications.map((notif) => {
          const b = notif.body
          const allItems = [
            ...(b.add_accounts ?? []).map((s) => ({ ...s, type: 'add_account' as const, value: s.handle!, icon: Plus })),
            ...(b.add_hashtags ?? []).map((s) => ({ ...s, type: 'add_hashtag' as const, value: s.tag!, icon: Plus })),
            ...(b.remove_accounts ?? []).map((s) => ({ ...s, type: 'remove_account' as const, value: s.handle!, icon: Minus })),
            ...(b.remove_hashtags ?? []).map((s) => ({ ...s, type: 'remove_hashtag' as const, value: s.tag!, icon: Minus })),
          ]

          return (
            <div key={notif.id} className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-accent">{sourceLabel(b.source)}</span>
                  <span className="text-xs text-text-muted">{notif.title}</span>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-text-muted" onClick={() => onDismiss(notif.id)}>
                  Dismiss all
                </Button>
              </div>
              <div className="space-y-2">
                {allItems.map((item, i) => {
                  const isRemove = item.type.startsWith('remove')
                  const key = `${notif.id}-${i}`
                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg bg-bg-surface px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <item.icon className={`h-3 w-3 shrink-0 ${isRemove ? 'text-status-failed' : 'text-status-scheduled'}`} />
                        <span className="text-sm font-medium truncate">{item.value}</span>
                        <span className="text-xs text-text-muted truncate">{item.reason}</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs shrink-0 ml-2" disabled={processing === key}
                        onClick={async () => { setProcessing(key); await onAccept(notif.id, item.type, item.value); setProcessing(null) }}>
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
