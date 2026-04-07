'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Platform = Database['public']['Tables']['platforms']['Row']

interface ConnectPlatformsProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
  selectedPlatforms: string[]
}

interface ConnectionState {
  [platformId: string]: 'idle' | 'saving' | 'connected' | 'skipped'
}

export function ConnectPlatforms({
  userId,
  supabase,
  onNext,
  onBack,
  selectedPlatforms,
}: ConnectPlatformsProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [connectionState, setConnectionState] = useState<ConnectionState>({})
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string }>>({})
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('platforms')
        .select('*')
        .in('id', selectedPlatforms)

      setPlatforms(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function connectCredentials(platform: Platform) {
    const cred = credentials[platform.id]
    if (!cred?.username || !cred?.password) return

    setConnectionState((prev) => ({ ...prev, [platform.id]: 'saving' }))

    await supabase.from('platform_accounts').insert({
      profile_id: userId,
      platform_id: platform.id,
      username: cred.username,
      credentials_encrypted: JSON.stringify({ username: cred.username, password: cred.password }),
      status: 'connected',
    })

    setConnectionState((prev) => ({ ...prev, [platform.id]: 'connected' }))
  }

  async function connectApiKey(platform: Platform) {
    const key = apiKeys[platform.id]
    if (!key) return

    setConnectionState((prev) => ({ ...prev, [platform.id]: 'saving' }))

    await supabase.from('platform_accounts').insert({
      profile_id: userId,
      platform_id: platform.id,
      credentials_encrypted: JSON.stringify({ api_key: key }),
      status: 'connected',
    })

    setConnectionState((prev) => ({ ...prev, [platform.id]: 'connected' }))
  }

  function startOAuth(platform: Platform) {
    window.location.href = `/api/oauth/${platform.slug}/authorize`
  }

  function skipPlatform(platformId: string) {
    setConnectionState((prev) => ({ ...prev, [platformId]: 'skipped' }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Connect your platforms</h1>
        <p className="mt-2 text-text-secondary">
          Link your accounts so Feathr can manage them for you. You can skip any and connect later.
        </p>
      </div>

      <div className="space-y-4">
        {platforms.map((platform) => {
          const state = connectionState[platform.id] ?? 'idle'

          if (state === 'connected') {
            return (
              <div
                key={platform.id}
                className="flex items-center justify-between rounded-lg border border-status-scheduled/50 bg-status-scheduled/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platform.color ?? '#666' }} />
                  <span className="text-sm font-medium">{platform.name}</span>
                </div>
                <span className="text-sm text-status-scheduled">Connected</span>
              </div>
            )
          }

          if (state === 'skipped') {
            return (
              <div
                key={platform.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platform.color ?? '#666' }} />
                  <span className="text-sm">{platform.name}</span>
                </div>
                <span className="text-sm text-text-muted">Skipped</span>
              </div>
            )
          }

          return (
            <div key={platform.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platform.color ?? '#666' }} />
                  <span className="text-sm font-medium">{platform.name}</span>
                </div>
                <button
                  onClick={() => skipPlatform(platform.id)}
                  className="text-xs text-text-muted hover:text-text-secondary"
                >
                  Skip
                </button>
              </div>

              {platform.auth_type === 'oauth' && (
                <Button
                  onClick={() => startOAuth(platform)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Connect {platform.name}
                </Button>
              )}

              {platform.auth_type === 'credentials' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Email or username</Label>
                    <Input
                      value={credentials[platform.id]?.username ?? ''}
                      onChange={(e) =>
                        setCredentials((prev) => ({
                          ...prev,
                          [platform.id]: { ...prev[platform.id], username: e.target.value, password: prev[platform.id]?.password ?? '' },
                        }))
                      }
                      className="bg-bg-surface h-9 text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input
                      type="password"
                      value={credentials[platform.id]?.password ?? ''}
                      onChange={(e) =>
                        setCredentials((prev) => ({
                          ...prev,
                          [platform.id]: { username: prev[platform.id]?.username ?? '', password: e.target.value },
                        }))
                      }
                      className="bg-bg-surface h-9 text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    onClick={() => connectCredentials(platform)}
                    disabled={state === 'saving'}
                    size="sm"
                    className="w-full bg-accent text-white hover:bg-accent-hover"
                  >
                    {state === 'saving' ? 'Saving...' : 'Save credentials'}
                  </Button>
                </div>
              )}

              {platform.auth_type === 'api_key' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">API key or token</Label>
                    <Input
                      value={apiKeys[platform.id] ?? ''}
                      onChange={(e) =>
                        setApiKeys((prev) => ({ ...prev, [platform.id]: e.target.value }))
                      }
                      className="bg-bg-surface h-9 text-sm"
                      placeholder="Paste your token here"
                    />
                  </div>
                  <Button
                    onClick={() => connectApiKey(platform)}
                    disabled={state === 'saving'}
                    size="sm"
                    className="w-full bg-accent text-white hover:bg-accent-hover"
                  >
                    {state === 'saving' ? 'Saving...' : 'Save token'}
                  </Button>
                </div>
              )}

              {platform.auth_type === 'manual' && (
                <p className="text-sm text-text-muted">
                  This platform needs to be connected manually. You can set this up later in Settings.
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          onClick={onNext}
          className="bg-accent text-white hover:bg-accent-hover"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
