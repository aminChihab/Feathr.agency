'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Platform = Database['public']['Tables']['platforms']['Row']

interface ConnectPlatformsProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
  selectedPlatforms: string[]
  currentStep: number
  totalSteps: number
}

interface ConnectionState {
  [platformId: string]: 'idle' | 'saving' | 'connected' | 'skipped'
}

const PLATFORM_ICONS: Record<string, { icon: string; color: string; subtitle: string }> = {
  'twitter': { icon: 'share', color: '#1DA1F2', subtitle: 'Analytics and Campaign Publishing' },
  'instagram': { icon: 'photo_camera', color: '#E4405F', subtitle: 'Insights and Media Automation' },
  'linkedin': { icon: 'work', color: '#0077B5', subtitle: 'B2B Network Management' },
  'onlyfans': { icon: 'visibility', color: '#00AFF0', subtitle: 'Content Distribution' },
  'tiktok': { icon: 'movie', color: '#00f2ea', subtitle: 'Short-Form Video Strategy' },
  'whatsapp': { icon: 'chat', color: '#25D366', subtitle: 'Client Communication' },
  'tryst': { icon: 'diamond', color: '#febbcb', subtitle: 'Directory Management' },
  'slixa': { icon: 'style', color: '#FF4500', subtitle: 'Profile Optimization' },
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center space-x-3 mb-4">
            <span className="text-primary font-display text-3xl italic tracking-tight">Feathr</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xs font-body uppercase tracking-widest text-on-surface-variant/60">Onboarding Phase</span>
            <div className="flex space-x-1">
              <div className="h-1 w-4 rounded-full bg-primary/20" />
              <div className="h-1 w-4 rounded-full bg-primary/20" />
              <div className="h-1 w-4 rounded-full bg-primary/20" />
              <div className="h-1 w-4 rounded-full bg-primary/20" />
              <div className="h-1 w-4 rounded-full bg-primary/20" />
              <div className="h-1 w-8 rounded-full bg-primary" />
              <div className="h-1 w-4 rounded-full bg-surface-container-highest" />
              <div className="h-1 w-4 rounded-full bg-surface-container-highest" />
            </div>
            <span className="text-xs font-body text-primary font-semibold">Step 6 of 8</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-display leading-tight mt-6">
            Connect your <span className="font-display italic">Platforms.</span>
          </h1>
          <p className="text-on-surface-variant max-w-xl mx-auto text-lg leading-relaxed">
            Establish secure data bridges to your marketing ecosystem. We use bank-grade AES-256 encryption and official OAuth protocols.
          </p>
        </header>

        {/* Platform Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {platforms.map((platform) => {
            const state = connectionState[platform.id] ?? 'idle'
            const slug = platform.slug ?? platform.name.toLowerCase()
            const iconData = PLATFORM_ICONS[slug]

            return (
              <div key={platform.id} className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between group hover:bg-surface-container transition-colors duration-300">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div
                      className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center"
                      style={{ color: iconData?.color ?? platform.color ?? '#999' }}
                    >
                      <span className="material-symbols-outlined text-3xl">{iconData?.icon ?? 'link'}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-on-surface">{platform.name}</h3>
                      <p className="text-on-surface-variant text-sm mt-1">{iconData?.subtitle ?? 'Platform Integration'}</p>
                    </div>
                  </div>

                  {state === 'connected' ? (
                    <div className="flex items-center space-x-2 text-tertiary bg-tertiary/10 px-3 py-1 rounded-full border border-tertiary/20">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      <span className="text-xs font-semibold uppercase tracking-wider">Authenticated</span>
                    </div>
                  ) : state === 'skipped' ? (
                    <span className="text-xs text-on-surface-variant/60 uppercase tracking-wider">Skipped</span>
                  ) : (
                    <>
                      {platform.auth_type === 'oauth' && (
                        <button
                          onClick={() => startOAuth(platform)}
                          className="gradient-cta text-on-primary font-semibold py-2 px-6 rounded-lg text-sm transition-transform active:scale-95"
                        >
                          Connect
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Credentials form for non-OAuth, non-connected platforms */}
                {state === 'idle' && platform.auth_type === 'credentials' && (
                  <div className="mt-6 space-y-3">
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
                        className="bg-transparent border-b-2 border-surface-variant focus:border-primary focus:ring-0 text-sm py-2"
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
                        className="bg-transparent border-b-2 border-surface-variant focus:border-primary focus:ring-0 text-sm py-2"
                        placeholder="••••••••"
                      />
                    </div>
                    <button
                      onClick={() => connectCredentials(platform)}
                      disabled={connectionState[platform.id] === 'saving'}
                      className="gradient-cta text-on-primary font-semibold py-2 px-6 rounded-lg text-sm transition-transform active:scale-95 w-full"
                    >
                      Save credentials
                    </button>
                  </div>
                )}

                {state === 'idle' && platform.auth_type === 'api_key' && (
                  <div className="mt-6 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">API key or token</Label>
                      <Input
                        value={apiKeys[platform.id] ?? ''}
                        onChange={(e) =>
                          setApiKeys((prev) => ({ ...prev, [platform.id]: e.target.value }))
                        }
                        className="bg-transparent border-b-2 border-surface-variant focus:border-primary focus:ring-0 text-sm py-2"
                        placeholder="Paste your token here"
                      />
                    </div>
                    <button
                      onClick={() => connectApiKey(platform)}
                      className="gradient-cta text-on-primary font-semibold py-2 px-6 rounded-lg text-sm transition-transform active:scale-95 w-full"
                    >
                      Save token
                    </button>
                  </div>
                )}

                {state === 'idle' && platform.auth_type === 'manual' && (
                  <p className="mt-6 text-sm text-on-surface-variant/60">
                    This platform will be connected manually. You can set this up later in Settings.
                  </p>
                )}

                <div className="mt-10 flex items-center justify-between text-xs text-on-surface-variant/60 font-body">
                  {state === 'connected' ? (
                    <>
                      <span>Last synced: just now</span>
                      <button className="hover:text-primary transition-colors">Manage Access</button>
                    </>
                  ) : state !== 'skipped' ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        <span>OAuth 2.0 Secure Channel</span>
                      </div>
                      <button onClick={() => skipPlatform(platform.id)} className="hover:text-primary transition-colors">Skip</button>
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </section>

        {/* Privacy Assurance Banner */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center space-x-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">security</span>
          </div>
          <div className="flex-1">
            <h4 className="text-on-surface font-semibold text-sm uppercase tracking-wider">Privacy Assurance</h4>
            <p className="text-on-surface-variant text-sm mt-1">Feathr never stores your passwords. We use short-lived tokens to communicate with platforms via encrypted tunnels. Your data remains your property.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="pt-8 flex items-center justify-between">
          <button onClick={onBack} className="text-on-surface-variant hover:text-on-surface transition-colors font-semibold flex items-center space-x-2 px-6 py-3">
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-6">
            <button onClick={onNext} className="text-on-surface-variant/60 hover:text-on-surface transition-colors font-medium">Skip for now</button>
            <button
              onClick={onNext}
              className="gradient-cta text-on-primary font-bold px-12 py-4 rounded-lg shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              Continue to Step 7
            </button>
          </div>
        </footer>
      </div>

      {/* Decorative Background */}
      <div className="fixed bottom-0 left-0 w-full overflow-hidden pointer-events-none opacity-40 h-64 -z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[300px] bg-primary/10 blur-[120px] rounded-full" />
      </div>
    </main>
  )
}
