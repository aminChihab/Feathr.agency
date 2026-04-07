// src/components/dashboard/post-modal.tsx
'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
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

export function PostModal({ open, onClose, supabase, userId, editPost, onSaved }: PostModalProps) {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [platformAccountId, setPlatformAccountId] = useState('')
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
      setPlatformAccountId(editPost.platform_account_id)
      setCaption(editPost.caption ?? '')
      setMediaIds((editPost.media_ids as string[]) ?? [])
      setScheduledAt(editPost.scheduled_at ? editPost.scheduled_at.slice(0, 16) : '')
    } else {
      setPlatformAccountId('')
      setCaption('')
      setMediaIds([])
      setScheduledAt('')
    }
  }, [editPost, open])

  async function handleSave(status: 'draft' | 'approved') {
    if (!platformAccountId) return
    setSaving(true)

    const data = {
      profile_id: userId,
      platform_account_id: platformAccountId,
      caption: caption || null,
      media_ids: mediaIds,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status,
    }

    if (editPost) {
      await supabase
        .from('content_calendar')
        .update(data)
        .eq('id', editPost.id)
    } else {
      await supabase
        .from('content_calendar')
        .insert(data)
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
            <Label>Platform</Label>
            <Select value={platformAccountId} onValueChange={setPlatformAccountId}>
              <SelectTrigger className="bg-bg-base">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.platforms?.name ?? 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-bg-base"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={!platformAccountId || saving}
            >
              Save as draft
            </Button>
            <Button
              onClick={() => handleSave('approved')}
              disabled={!platformAccountId || saving}
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
