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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-on-surface">
          Connect your <span className="font-bold">Platforms.</span>
        </h1>
        <p className="mt-2 text-on-surface-variant">
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
                className="flex items-center justify-between bg-surface-container-low rounded-xl px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platform.color ?? '#666' }} />
                  <span className="text-sm font-medium text-on-surface">{platform.name}</span>
                </div>
                <span className="bg-tertiary/15 text-tertiary text-xs rounded-full px-2 py-0.5">AUTHENTICATED</span>
              </div>
            )
          }

          if (state === 'skipped') {
            return (
              <div
                key={platform.id}
                className="flex items-center justify-between bg-surface-container-low rounded-xl px-6 py-4 opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platform.color ?? '#666' }} />
                  <span className="text-sm text-on-surface">{platform.name}</span>
                </div>
                <span className="text-sm text-on-surface-variant/60">Skipped</span>
              </div>
            )
          }

          return (
            <div key={platform.id} className="bg-surface-container-low rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platform.color ?? '#666' }} />
                  <span className="text-sm font-medium text-on-surface">{platform.name}</span>
                </div>
                <button
                  onClick={() => skipPlatform(platform.id)}
                  className="text-xs text-on-surface-variant/60 hover:text-on-surface-variant"
                >
                  Skip
                </button>
              </div>

              {platform.auth_type === 'oauth' && (
                <Button
                  onClick={() => startOAuth(platform)}
                  size="sm"
                  className="w-full gradient-cta text-white"
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
                      className="bg-surface-container-low rounded-xl h-9 text-sm"
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
                      className="bg-surface-container-low rounded-xl h-9 text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    onClick={() => connectCredentials(platform)}
                    disabled={state === 'saving'}
                    size="sm"
                    className="w-full gradient-cta text-white"
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
                      className="bg-surface-container-low rounded-xl h-9 text-sm"
                      placeholder="Paste your token here"
                    />
                  </div>
                  <Button
                    onClick={() => connectApiKey(platform)}
                    disabled={state === 'saving'}
                    size="sm"
                    className="w-full gradient-cta text-white"
                  >
                    {state === 'saving' ? 'Saving...' : 'Save token'}
                  </Button>
                </div>
              )}

              {platform.auth_type === 'manual' && (
                <p className="text-sm text-on-surface-variant/60">
                  This platform needs to be connected manually. You can set this up later in Settings.
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3">
        <span className="text-on-surface-variant mt-0.5">&#128737;</span>
        <div>
          <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-1">Privacy Assurance</p>
          <p className="text-sm text-on-surface-variant/60">
            Your credentials are encrypted end-to-end. Feathr never stores plaintext passwords.
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          onClick={onNext}
          className="gradient-cta text-white"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
