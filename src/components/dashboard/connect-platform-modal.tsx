// src/components/dashboard/connect-platform-modal.tsx
'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Platform = Database['public']['Tables']['platforms']['Row']

interface ConnectPlatformModalProps {
  open: boolean
  onClose: () => void
  supabase: SupabaseClient<Database>
  userId: string
  connectedPlatformIds: string[]
  reconnectPlatform?: { platformSlug: string; authType: string; platformName: string } | null
  onConnected: () => void
}

export function ConnectPlatformModal({
  open, onClose, supabase, userId, connectedPlatformIds, reconnectPlatform, onConnected,
}: ConnectPlatformModalProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    async function load() {
      const { data } = await supabase.from('platforms').select('*').eq('is_active', true).order('name')
      setPlatforms(data ?? [])
      setLoading(false)

      if (reconnectPlatform) {
        const p = (data ?? []).find((pl) => pl.slug === reconnectPlatform.platformSlug)
        if (p) setSelectedPlatform(p)
      }
    }
    load()
  }, [open])

  async function connectCredentials() {
    if (!selectedPlatform || !credentials.username || !credentials.password) return
    setSaving(true)
    await supabase.from('platform_accounts').upsert({
      profile_id: userId,
      platform_id: selectedPlatform.id,
      username: credentials.username,
      credentials_encrypted: JSON.stringify(credentials),
      status: 'connected',
    }, { onConflict: 'profile_id,platform_id' })
    setSaving(false)
    onConnected()
    handleClose()
  }

  async function connectApiKey() {
    if (!selectedPlatform || !apiKey) return
    setSaving(true)
    await supabase.from('platform_accounts').upsert({
      profile_id: userId,
      platform_id: selectedPlatform.id,
      credentials_encrypted: JSON.stringify({ api_key: apiKey }),
      status: 'connected',
    }, { onConflict: 'profile_id,platform_id' })
    setSaving(false)
    onConnected()
    handleClose()
  }

  function startOAuth() {
    if (!selectedPlatform) return
    window.location.href = `/api/oauth/${selectedPlatform.slug}/authorize`
  }

  function handleClose() {
    setSelectedPlatform(null)
    setCredentials({ username: '', password: '' })
    setApiKey('')
    onClose()
  }

  const CATEGORY_ORDER = ['social', 'content_income', 'directory', 'communication']
  const CATEGORY_LABELS: Record<string, string> = {
    social: 'Social Media', content_income: 'Content & Income',
    directory: 'Directories', communication: 'Communication',
  }

  const availablePlatforms = platforms.filter((p) => !connectedPlatformIds.includes(p.id))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-surface-container-low border-outline-variant/10 max-w-lg max-h-[80vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-on-surface">
            {selectedPlatform ? `Connect ${selectedPlatform.name}` : 'Add platform'}
          </DialogTitle>
        </DialogHeader>

        {!selectedPlatform ? (
          loading ? (
            <p className="text-center text-on-surface-variant/60 py-8">Loading...</p>
          ) : availablePlatforms.length === 0 ? (
            <p className="text-center text-on-surface-variant/60 py-8">All platforms are already connected.</p>
          ) : (
            <div className="space-y-4">
              {CATEGORY_ORDER.map((cat) => {
                const catPlatforms = availablePlatforms.filter((p) => p.category === cat)
                if (catPlatforms.length === 0) return null
                return (
                  <div key={cat} className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant/60">{CATEGORY_LABELS[cat]}</p>
                    {catPlatforms.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlatform(p)}
                        className="flex w-full items-center gap-3 rounded-xl bg-surface-container px-4 py-3 text-left transition-colors hover:bg-surface-container-high"
                      >
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color ?? '#666' }} />
                        <span className="text-sm text-on-surface">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {selectedPlatform.auth_type === 'oauth' && (
              <Button onClick={startOAuth} className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container hover:opacity-90 active:scale-95 transition-all">
                Connect {selectedPlatform.name}
              </Button>
            )}
            {selectedPlatform.auth_type === 'credentials' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-on-surface-variant">Email or username</Label>
                  <Input value={credentials.username} onChange={(e) => setCredentials((p) => ({ ...p, username: e.target.value }))} className="bg-surface-container-high border-none" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-on-surface-variant">Password</Label>
                  <Input type="password" value={credentials.password} onChange={(e) => setCredentials((p) => ({ ...p, password: e.target.value }))} className="bg-surface-container-high border-none" />
                </div>
                <Button onClick={connectCredentials} disabled={saving} className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container hover:opacity-90 active:scale-95 transition-all">
                  {saving ? 'Saving...' : 'Save credentials'}
                </Button>
              </div>
            )}
            {selectedPlatform.auth_type === 'api_key' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-on-surface-variant">API key or token</Label>
                  <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="bg-surface-container-high border-none" />
                </div>
                <Button onClick={connectApiKey} disabled={saving} className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container hover:opacity-90 active:scale-95 transition-all">
                  {saving ? 'Saving...' : 'Save token'}
                </Button>
              </div>
            )}
            {selectedPlatform.auth_type === 'manual' && (
              <p className="text-sm text-on-surface-variant/60">This platform needs to be connected manually. Set this up in the platform&apos;s own settings.</p>
            )}
            <Button variant="ghost" onClick={() => setSelectedPlatform(null)} className="w-full text-on-surface-variant hover:text-on-surface">Back to platforms</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
