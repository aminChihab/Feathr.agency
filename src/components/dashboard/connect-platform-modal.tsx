// src/components/dashboard/connect-platform-modal.tsx
'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Platform = Database['public']['Tables']['platforms']['Row']

/* Icon config per platform slug */
const PLATFORM_VISUALS: Record<string, { bg: string; icon: string }> = {
  instagram: { bg: 'bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888]', icon: 'photo_camera' },
  twitter: { bg: 'bg-black', icon: 'close' },
  x: { bg: 'bg-black', icon: 'close' },
  whatsapp: { bg: 'bg-[#25D366]', icon: 'chat' },
  facebook: { bg: 'bg-[#1877F2]', icon: 'social_leaderboard' },
  tiktok: { bg: 'bg-black', icon: 'linked_camera' },
  linkedin: { bg: 'bg-[#0A66C2]', icon: 'work' },
  threads: { bg: 'bg-black', icon: 'alternate_email' },
  youtube: { bg: 'bg-[#FF0000]', icon: 'youtube_activity' },
}

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
          <DialogTitle className="font-display text-on-surface text-xl">
            {selectedPlatform ? `Connect ${selectedPlatform.name}` : 'Discover Integrations'}
          </DialogTitle>
          <p className="text-xs text-on-surface-variant mt-1">
            {selectedPlatform
              ? 'Authenticate to link this platform to your atelier.'
              : 'Select a platform to begin the connection process.'}
          </p>
        </DialogHeader>

        {!selectedPlatform ? (
          loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : availablePlatforms.length === 0 ? (
            <p className="text-center text-on-surface-variant/60 py-8 text-sm">All platforms are already connected.</p>
          ) : (
            <div className="space-y-6 mt-2">
              {CATEGORY_ORDER.map((cat) => {
                const catPlatforms = availablePlatforms.filter((p) => p.category === cat)
                if (catPlatforms.length === 0) return null
                return (
                  <div key={cat} className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/60">{CATEGORY_LABELS[cat]}</p>
                    {catPlatforms.map((p) => {
                      const visuals = PLATFORM_VISUALS[p.slug ?? '']
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPlatform(p)}
                          className="flex w-full items-center gap-4 rounded-lg bg-surface-container px-4 py-3 text-left transition-all hover:bg-surface-bright group"
                        >
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center ${visuals?.bg ?? ''}`}
                            style={!visuals ? { backgroundColor: p.color ?? '#666' } : undefined}
                          >
                            <span className="material-symbols-outlined text-white text-base">
                              {visuals?.icon ?? 'hub'}
                            </span>
                          </div>
                          <span className="text-sm text-on-surface font-medium">{p.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div className="space-y-4 mt-2">
            {selectedPlatform.auth_type === 'oauth' && (
              <button
                onClick={startOAuth}
                className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">link</span>
                Connect {selectedPlatform.name}
              </button>
            )}
            {selectedPlatform.auth_type === 'credentials' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-on-surface-variant">Email or username</Label>
                  <Input value={credentials.username} onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))} className="bg-surface-container-high border-none text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-on-surface-variant">Password</Label>
                  <Input type="password" value={credentials.password} onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))} className="bg-surface-container-high border-none text-sm" />
                </div>
                <button
                  onClick={connectCredentials}
                  disabled={saving}
                  className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save credentials'}
                </button>
              </div>
            )}
            {selectedPlatform.auth_type === 'api_key' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-on-surface-variant">API key or token</Label>
                  <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="bg-surface-container-high border-none text-sm" />
                </div>
                <button
                  onClick={connectApiKey}
                  disabled={saving}
                  className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save token'}
                </button>
              </div>
            )}
            {selectedPlatform.auth_type === 'manual' && (
              <p className="text-sm text-on-surface-variant/60">This platform needs to be connected manually. Set this up in the platform&apos;s own settings.</p>
            )}
            <button
              onClick={() => setSelectedPlatform(null)}
              className="w-full py-2.5 text-on-surface-variant hover:text-on-surface text-sm transition-colors"
            >
              Back to platforms
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
