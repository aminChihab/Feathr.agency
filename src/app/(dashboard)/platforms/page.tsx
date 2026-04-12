'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PlatformCard } from '@/components/dashboard/platform-card'
import { ConnectPlatformModal } from '@/components/dashboard/connect-platform-modal'
import { AlertTriangle } from 'lucide-react'

interface PlatformAccount {
  id: string
  username: string | null
  status: string
  connected_at: string
  schedule_json: any
  platform_id: string
  platform_name: string
  platform_color: string
  platform_slug: string
  auth_type: string
}

interface ExpiredPlatform {
  id: string
  name: string
  slug: string
}

export default function PlatformsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [reconnectPlatform, setReconnectPlatform] = useState<{ platformSlug: string; authType: string; platformName: string } | null>(null)
  const [expiredPlatforms, setExpiredPlatforms] = useState<ExpiredPlatform[]>([])
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        await loadAccounts(user.id)
        checkTokens()
      }
    }
    init()
  }, [])

  async function loadAccounts(uid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('platform_accounts')
      .select('*, platforms(name, color, slug, auth_type)')
      .eq('profile_id', uid)
      .order('connected_at', { ascending: false })

    const mapped: PlatformAccount[] = (data ?? []).map((item: any) => ({
      id: item.id,
      username: item.username,
      status: item.status,
      connected_at: item.connected_at,
      schedule_json: item.schedule_json,
      platform_id: item.platform_id,
      platform_name: item.platforms?.name ?? 'Unknown',
      platform_color: item.platforms?.color ?? '#666',
      platform_slug: item.platforms?.slug ?? '',
      auth_type: item.platforms?.auth_type ?? 'manual',
    }))

    setAccounts(mapped)
    setLoading(false)
  }

  async function checkTokens() {
    setChecking(true)
    try {
      const res = await fetch('/api/platforms/check-tokens', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setExpiredPlatforms(data.expired ?? [])
        // Refresh accounts to reflect updated statuses
        if (data.expired?.length > 0 && userId) {
          await loadAccounts(userId)
        }
      }
    } catch (err) {
      console.error('[platforms] Token check failed:', err)
    } finally {
      setChecking(false)
    }
  }

  async function handleDisconnect(id: string) {
    await supabase.from('platform_accounts').delete().eq('id', id)
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setExpiredPlatforms((prev) => prev.filter((p) => p.id !== id))
  }

  function handleReconnect(account: PlatformAccount) {
    setReconnectPlatform({
      platformSlug: account.platform_slug,
      authType: account.auth_type,
      platformName: account.platform_name,
    })
    setModalOpen(true)
  }

  async function handleScheduleChange(id: string, frequency: string) {
    await supabase
      .from('platform_accounts')
      .update({ schedule_json: { frequency } })
      .eq('id', id)
    setAccounts((prev) =>
      prev.map((a) => a.id === id ? { ...a, schedule_json: { frequency } } : a)
    )
  }

  if (!userId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-light">Platforms</h1>
        <Button onClick={() => { setReconnectPlatform(null); setModalOpen(true) }} className="bg-accent text-white hover:bg-accent-hover">
          Add platform
        </Button>
      </div>

      {expiredPlatforms.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-status-draft/30 bg-status-draft/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-status-draft mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">
              {expiredPlatforms.length === 1
                ? `${expiredPlatforms[0].name} needs to be reconnected`
                : `${expiredPlatforms.length} platforms need to be reconnected`}
            </p>
            <p className="text-xs text-text-muted">
              {expiredPlatforms.map((p) => p.name).join(', ')} — authorization has expired. Click Reconnect to re-authorize.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-surface p-12 text-center">
          <p className="text-text-muted">No platforms connected yet. Add your first platform to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <PlatformCard
              key={account.id}
              account={account}
              onDisconnect={handleDisconnect}
              onReconnect={handleReconnect}
              onScheduleChange={handleScheduleChange}
            />
          ))}
        </div>
      )}

      <ConnectPlatformModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setReconnectPlatform(null)
          // Recheck after reconnect
          if (userId) {
            loadAccounts(userId)
            checkTokens()
          }
        }}
        supabase={supabase}
        userId={userId}
        connectedPlatformIds={accounts.map((a) => a.platform_id)}
        reconnectPlatform={reconnectPlatform}
        onConnected={() => {
          if (userId) {
            loadAccounts(userId)
            setExpiredPlatforms([])
            checkTokens()
          }
        }}
      />
    </div>
  )
}
