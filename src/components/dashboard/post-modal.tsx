// src/components/dashboard/post-modal.tsx
'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MediaPicker } from './media-picker'

type PlatformAccount = {
  id: string
  platform_id: string
  platforms: { name: string; color: string } | null
}

type CalendarItem = Database['public']['Tables']['content_calendar']['Row']

interface PostModalProps {
  open: boolean
  onClose: () => void
  supabase: SupabaseClient<Database>
  userId: string
  editPost?: CalendarItem | null
  onSaved: () => void
}

function getSchedulePresets(): { label: string; value: string }[] {
  const now = new Date()

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const tomorrowMorning = new Date(tomorrow)
  tomorrowMorning.setHours(9, 0, 0, 0)

  const tomorrowEvening = new Date(tomorrow)
  tomorrowEvening.setHours(18, 0, 0, 0)

  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(9, 0, 0, 0)

  return [
    { label: 'Now', value: now.toISOString().slice(0, 16) },
    { label: 'Tomorrow morning', value: tomorrowMorning.toISOString().slice(0, 16) },
    { label: 'Tomorrow evening', value: tomorrowEvening.toISOString().slice(0, 16) },
    { label: 'Next week', value: nextWeek.toISOString().slice(0, 16) },
  ]
}

export function PostModal({ open, onClose, supabase, userId, editPost, onSaved }: PostModalProps) {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [mediaIds, setMediaIds] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadAccounts() {
      const { data } = await supabase
        .from('platform_accounts')
        .select('id, platform_id, platforms(name, color)')
        .eq('profile_id', userId)
        .eq('status', 'connected')

      setAccounts((data as unknown as PlatformAccount[]) ?? [])
    }
    loadAccounts()
  }, [])

  useEffect(() => {
    if (editPost) {
      setSelectedAccountIds([editPost.platform_account_id])
      setCaption(editPost.caption ?? '')
      setMediaIds((editPost.media_ids as string[]) ?? [])
      setScheduledAt(editPost.scheduled_at ? editPost.scheduled_at.slice(0, 16) : '')
    } else {
      setSelectedAccountIds([])
      setCaption('')
      setMediaIds([])
      setScheduledAt(new Date().toISOString().slice(0, 16))
    }
  }, [editPost, open])

  async function handleSave(status: 'draft' | 'approved') {
    if (selectedAccountIds.length === 0) return
    setSaving(true)

    if (editPost) {
      // Edit mode: update the single existing post
      await supabase
        .from('content_calendar')
        .update({
          profile_id: userId,
          platform_account_id: selectedAccountIds[0],
          caption: caption || null,
          media_ids: mediaIds,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          status,
        })
        .eq('id', editPost.id)
    } else {
      // New post: create one row per selected platform
      const rows = selectedAccountIds.map(accountId => ({
        profile_id: userId,
        platform_account_id: accountId,
        caption: caption || null,
        media_ids: mediaIds,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status,
      }))
      await supabase.from('content_calendar').insert(rows)
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-bg-surface border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-light">{editPost ? 'Edit post' : 'New post'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {accounts.map((acc) => (
                <label
                  key={acc.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-elevated"
                >
                  <Checkbox
                    checked={selectedAccountIds.includes(acc.id)}
                    onCheckedChange={(checked) => {
                      setSelectedAccountIds(prev =>
                        checked
                          ? [...prev, acc.id]
                          : prev.filter(id => id !== acc.id)
                      )
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: acc.platforms?.color ?? '#666' }} />
                    <span className="text-sm">{acc.platforms?.name ?? 'Unknown'}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              className="bg-bg-base"
              placeholder="Write your post..."
            />
          </div>

          <div className="space-y-2">
            <Label>Media</Label>
            <MediaPicker
              supabase={supabase}
              userId={userId}
              selected={mediaIds}
              onSelectionChange={setMediaIds}
            />
          </div>

          <div className="space-y-2">
            <Label>Schedule</Label>
            <div className="flex flex-wrap gap-2">
              {getSchedulePresets().map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setScheduledAt(preset.value)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    scheduledAt === preset.value
                      ? 'bg-accent text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <Input
              type="datetime-local"
              value={scheduledAt.includes('T') ? scheduledAt.slice(0, 16) : scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-bg-base"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={selectedAccountIds.length === 0 || saving}
            >
              Save as draft
            </Button>
            <Button
              onClick={() => handleSave('approved')}
              disabled={selectedAccountIds.length === 0 || saving}
              className="bg-accent text-white hover:bg-accent-hover"
            >
              {saving ? 'Saving...' : 'Approve & schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
