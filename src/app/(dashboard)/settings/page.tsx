'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'
import {
  User, Mic, Link2, Calendar, Bell, Shield, CreditCard,
} from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']
type PlatformAccount = {
  id: string
  platform_name: string
  platform_color: string
  schedule_json: any
}

const GOALS = [
  { value: 'more_bookings', label: 'Get more bookings' },
  { value: 'grow_online', label: 'Grow my online presence' },
  { value: 'build_onlyfans', label: 'Build my OnlyFans' },
  { value: 'go_independent', label: 'Go independent' },
  { value: 'manage_platforms', label: 'Manage multiple platforms efficiently' },
]

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '2x_daily', label: '2x per day' },
  { value: '3x_weekly', label: '3x per week' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
]

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'platforms', label: 'Platforms', icon: Link2 },
  { id: 'planning', label: 'Planning', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Profile form state
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [voiceDescription, setVoiceDescription] = useState('')

  // Notification settings
  const [notifNewMessages, setNotifNewMessages] = useState(true)
  const [notifDraftReady, setNotifDraftReady] = useState(true)
  const [notifLeadQualified, setNotifLeadQualified] = useState(true)
  const [notifListingExpiring, setNotifListingExpiring] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setUserEmail(user.email ?? '')

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setName(profileData.professional_name ?? '')
        setCity(profileData.city ?? '')
        setGoals((profileData.goals as string[]) ?? [])
        setVoiceDescription(profileData.voice_description ?? '')

        const settings = (profileData.settings as any) ?? {}
        setNotifNewMessages(settings.notif_new_messages ?? true)
        setNotifDraftReady(settings.notif_draft_ready ?? true)
        setNotifLeadQualified(settings.notif_lead_qualified ?? true)
        setNotifListingExpiring(settings.notif_listing_expiring ?? true)
      }

      const { data: accountsData } = await supabase
        .from('platform_accounts')
        .select('id, schedule_json, platforms(name, color)')
        .eq('profile_id', user.id)
        .eq('status', 'connected')

      setAccounts(
        (accountsData ?? []).map((a: any) => ({
          id: a.id,
          platform_name: a.platforms?.name ?? 'Unknown',
          platform_color: a.platforms?.color ?? '#666',
          schedule_json: a.schedule_json,
        }))
      )

      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile() {
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({
      professional_name: name.trim() || null,
      city: city.trim() || null,
      goals,
    }).eq('id', userId)
    setSaving(false)
    flashSaved()
  }

  async function saveVoice() {
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({
      voice_description: voiceDescription.trim() || null,
    }).eq('id', userId)
    setSaving(false)
    flashSaved()
  }

  async function saveNotifications() {
    if (!userId) return
    setSaving(true)
    const currentSettings = (profile?.settings as any) ?? {}
    await supabase.from('profiles').update({
      settings: {
        ...currentSettings,
        notif_new_messages: notifNewMessages,
        notif_draft_ready: notifDraftReady,
        notif_lead_qualified: notifLeadQualified,
        notif_listing_expiring: notifListingExpiring,
      },
    }).eq('id', userId)
    setSaving(false)
    flashSaved()
  }

  async function updateSchedule(accountId: string, frequency: string) {
    await supabase.from('platform_accounts').update({ schedule_json: { frequency } }).eq('id', accountId)
    setAccounts((prev) =>
      prev.map((a) => a.id === accountId ? { ...a, schedule_json: { frequency } } : a)
    )
    flashSaved()
  }

  async function handleDeleteAccount() {
    if (!userId) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  function toggleGoal(goal: string) {
    setGoals((prev) => prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal])
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading || !userId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex gap-8">
      {/* Vertical tabs */}
      <nav className="w-48 flex-shrink-0 space-y-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="flex-1 max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light">Settings</h1>
          {saved && <span className="text-sm text-status-scheduled">Saved</span>}
        </div>

        {/* Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Professional name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-bg-surface" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-bg-surface" />
            </div>
            <div className="space-y-3">
              <Label>Goals</Label>
              {GOALS.map((goal) => (
                <label key={goal.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-bg-surface">
                  <Checkbox checked={goals.includes(goal.value)} onCheckedChange={() => toggleGoal(goal.value)} />
                  <span className="text-sm">{goal.label}</span>
                </label>
              ))}
            </div>
            <Button onClick={saveProfile} disabled={saving} className="bg-accent text-white hover:bg-accent-hover">
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        )}

        {/* Voice */}
        {activeTab === 'voice' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Voice description</Label>
              <Textarea
                value={voiceDescription}
                onChange={(e) => setVoiceDescription(e.target.value)}
                rows={6}
                className="bg-bg-surface"
                placeholder="Describe how you communicate..."
              />
              <p className="text-sm text-text-muted">
                This is how your AI-written content and messages will sound. 2-3 sentences is perfect.
              </p>
            </div>
            <Button onClick={saveVoice} disabled={saving} className="bg-accent text-white hover:bg-accent-hover">
              {saving ? 'Saving...' : 'Save voice'}
            </Button>
          </div>
        )}

        {/* Platforms */}
        {activeTab === 'platforms' && (
          <div className="space-y-4">
            <p className="text-text-secondary">
              Manage your connected platforms, add new ones, and adjust settings.
            </p>
            <Link href="/platforms">
              <Button variant="outline">Go to Platforms</Button>
            </Link>
          </div>
        )}

        {/* Planning */}
        {activeTab === 'planning' && (
          <div className="space-y-4">
            <p className="text-text-secondary">Set how often Feathr posts on each platform.</p>
            {accounts.length === 0 ? (
              <p className="text-text-muted">No platforms connected yet.</p>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <span className="text-sm font-medium" style={{ color: account.platform_color }}>
                      {account.platform_name}
                    </span>
                    <Select
                      value={account.schedule_json?.frequency ?? ''}
                      onValueChange={(val) => updateSchedule(account.id, val)}
                    >
                      <SelectTrigger className="w-40 bg-bg-base">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="space-y-3">
              {[
                { label: 'New messages', checked: notifNewMessages, onChange: setNotifNewMessages },
                { label: 'Draft ready for review', checked: notifDraftReady, onChange: setNotifDraftReady },
                { label: 'Lead qualified', checked: notifLeadQualified, onChange: setNotifLeadQualified },
                { label: 'Listing expiring', checked: notifListingExpiring, onChange: setNotifListingExpiring },
              ].map((item) => (
                <label key={item.label} className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-bg-surface">
                  <span className="text-sm">{item.label}</span>
                  <Checkbox checked={item.checked} onCheckedChange={(c) => item.onChange(c === true)} />
                </label>
              ))}
            </div>
            <Button onClick={saveNotifications} disabled={saving} className="bg-accent text-white hover:bg-accent-hover">
              {saving ? 'Saving...' : 'Save preferences'}
            </Button>
          </div>
        )}

        {/* Account */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={userEmail} disabled className="bg-bg-surface opacity-60" />
              <p className="text-xs text-text-muted">Contact support to change your email.</p>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <p className="text-sm text-text-muted">
                To change your password, sign out and use the &ldquo;Forgot password&rdquo; flow on the login page.
              </p>
            </div>
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-status-failed">Danger zone</h3>
              <p className="mt-1 text-xs text-text-muted">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                className="mt-3 border-status-failed/50 text-status-failed hover:bg-status-failed/10"
              >
                Delete account
              </Button>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent className="bg-bg-surface border-border max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-light">Delete account?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-text-secondary">
                  This will permanently delete your account, all your data, connected platforms, and content. This cannot be undone.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleDeleteAccount} className="bg-status-failed text-white hover:bg-status-failed/90">
                    Delete my account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Billing */}
        {activeTab === 'billing' && (
          <div className="rounded-lg border border-border bg-bg-surface p-8 text-center">
            <p className="text-text-muted">Billing will be available soon. During early access, Feathr is free.</p>
          </div>
        )}
      </div>
    </div>
  )
}
