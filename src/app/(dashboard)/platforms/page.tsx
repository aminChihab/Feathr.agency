// src/app/(dashboard)/platforms/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PlatformCard } from '@/components/dashboard/platform-card'
import { ConnectPlatformModal } from '@/components/dashboard/connect-platform-modal'

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

export default function PlatformsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [reconnectPlatform, setReconnectPlatform] = useState<{ platformSlug: string; authType: string; platformName: string } | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        loadAccounts(user.id)
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

  async function handleDisconnect(id: string) {
    await supabase.from('platform_accounts').delete().eq('id', id)
    setAccounts((prev) => prev.filter((a) => a.id !== id))
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
        onClose={() => { setModalOpen(false); setReconnectPlatform(null) }}
        supabase={supabase}
        userId={userId}
        connectedPlatformIds={accounts.map((a) => a.platform_id)}
        reconnectPlatform={reconnectPlatform}
        onConnected={() => userId && loadAccounts(userId)}
      />
    </div>
  )
}
