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
import {
  User, Mic, Link2, ListChecks, Calendar, Bell, Shield, CreditCard,
  Upload, FileText, Trash2, Sparkles, Loader2,
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
  { id: 'listings', label: 'Listings', icon: ListChecks },
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
  const [listings, setListings] = useState<any[]>([])
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
  const [voiceSample, setVoiceSample] = useState('')

  // Chat history files
  const [chatFiles, setChatFiles] = useState<{ name: string; path: string }[]>([])
  const [uploadingChats, setUploadingChats] = useState(false)
  const [analyzingVoice, setAnalyzingVoice] = useState(false)
  const [chatParticipants, setChatParticipants] = useState<string[]>([])
  const [selectedParticipant, setSelectedParticipant] = useState<string>('')

  // Research settings
  const DEFAULT_TERMS = [
    '"taking bookings" Amsterdam',
    '"hosting incall" Netherlands',
    'GFE available',
    '"dinner date" companion',
    '"outcall hotel"',
    'OnlyFans companion Amsterdam',
    'touring Europe availability',
    '"high class" companion Netherlands',
    '#GFE #companion',
    '"accepting bookings"',
  ]
  const DEFAULT_HANDLES = [
    'QualityEscort', 'escortamster', '247escortgirl', 'DutchEscort',
    'msveradijkmans', 'luxydutch', 'EllieLeen1', 'OFxxxKaylee', 'AlinaAbramsX',
  ]
  const [researchTerms, setResearchTerms] = useState<string[]>([])
  const [competitorHandles, setCompetitorHandles] = useState<string[]>([])
  const [newTerm, setNewTerm] = useState('')
  const [newHandle, setNewHandle] = useState('')

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
        setVoiceSample(profileData.voice_sample ?? '')

        const settings = (profileData.settings as any) ?? {}
        setResearchTerms(settings.research_terms ?? DEFAULT_TERMS)
        setCompetitorHandles(settings.competitor_handles ?? DEFAULT_HANDLES)
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

      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, status, renewal_status, expires_at, listing_url, performance, platform_accounts(platforms(name, color))')
        .eq('profile_id', user.id)

      if (listingsData) setListings(listingsData)

      // Load chat history files
      const { data: chatData } = await supabase.storage
        .from('chat-history')
        .list(user.id, { limit: 50 })
      if (chatData) {
        setChatFiles(chatData.map((f) => ({ name: f.name, path: `${user.id}/${f.name}` })))
      }

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

  function extractParticipants(text: string): string[] {
    const names = new Set<string>()
    const patterns = [
      /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*[-–]\s*(.+?):\s/gm,
      /^\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\]\s*(.+?):\s/gm,
      /^\d{1,2}-\d{1,2}-\d{2,4}\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*[-–]\s*(.+?):\s/gm,
    ]
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim()
        if (name && name.length < 40 && !name.includes('changed') && !name.includes('created')) {
          names.add(name)
        }
      }
    }
    return Array.from(names)
  }

  async function handleChatUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!userId || !e.target.files) return
    setUploadingChats(true)
    const newFiles = Array.from(e.target.files)
    const allParticipants = new Set(chatParticipants)

    for (const file of newFiles) {
      if (chatFiles.length >= 20) break

      const text = await file.text()
      const names = extractParticipants(text)
      names.forEach((n) => allParticipants.add(n))

      const path = `${userId}/${file.name}`
      const { error } = await supabase.storage
        .from('chat-history')
        .upload(path, file, { upsert: true })
      if (!error) {
        setChatFiles((prev) => [...prev, { name: file.name, path }])
      }
    }

    const participants = Array.from(allParticipants)
    setChatParticipants(participants)
    if (participants.length > 0 && !selectedParticipant) {
      setSelectedParticipant(participants[0])
    }

    setUploadingChats(false)
    e.target.value = ''
  }

  async function removeChatFile(path: string) {
    await supabase.storage.from('chat-history').remove([path])
    setChatFiles((prev) => prev.filter((f) => f.path !== path))
  }

  async function analyzeVoice() {
    if (!userId) return
    setAnalyzingVoice(true)
    try {
      const res = await fetch('/api/agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'chat-analyzer',
          profile_id: userId,
          title: `Analyze chat history and update voice profile. The creator's name in the chats is: "${selectedParticipant}"`,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        console.log('[voice] Triggered chat analyzer:', data.identifier)
      } else {
        console.error('[voice] Failed to trigger:', data)
      }
    } catch (err) {
      console.error('[voice] Analysis failed:', err)
    } finally {
      setAnalyzingVoice(false)
    }
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

  async function saveResearch() {
    if (!userId) return
    setSaving(true)
    const currentSettings = (profile?.settings as any) ?? {}
    await supabase.from('profiles').update({
      settings: {
        ...currentSettings,
        research_terms: researchTerms,
        competitor_handles: competitorHandles,
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center h-20 px-10 shadow-2xl shadow-black/40">
        <h2 className="font-display text-3xl font-light text-primary">Settings</h2>
        {saved && <span className="text-sm text-tertiary">Saved</span>}
      </header>

      <div className="p-10 space-y-6">
      {/* Sub-navigation pills */}
      <nav className="flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-surface-container-low rounded-lg text-on-surface font-medium'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="max-w-xl space-y-6">

        {/* Profile */}
        {activeTab === 'profile' && (
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Professional name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-surface" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">City</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-surface" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Goals</label>
              {GOALS.map((goal) => (
                <label key={goal.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant/10 px-4 py-3 transition-colors hover:bg-surface-container-highest">
                  <Checkbox checked={goals.includes(goal.value)} onCheckedChange={() => toggleGoal(goal.value)} />
                  <span className="text-sm text-on-surface">{goal.label}</span>
                </label>
              ))}
            </div>
            <Button onClick={saveProfile} disabled={saving} className="gradient-cta text-white">
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        )}

        {/* Voice */}
        {activeTab === 'voice' && (
          <div className="space-y-6">
            {/* Voice description */}
            <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-4">
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Voice description</label>
              <Textarea
                value={voiceDescription}
                onChange={(e) => setVoiceDescription(e.target.value)}
                rows={4}
                className="bg-surface"
                placeholder="Describe how you communicate — your tone, humor, boundaries, and style..."
              />
              <p className="text-xs text-on-surface-variant/60">
                Describe your voice in your own words. This is read by the AI alongside the analyzed voice profile below.
              </p>
              <Button onClick={saveVoice} disabled={saving} className="gradient-cta text-white">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>

            {/* Voice sample — JSON generated from chat analysis */}
            {voiceSample && (() => {
              let parsed: any = null
              try { parsed = JSON.parse(voiceSample) } catch {}
              if (!parsed || typeof parsed !== 'object') return null

              return (
                <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Analyzed voice profile</label>
                    <p className="text-xs text-on-surface-variant/60 mt-1">Generated from your chat history. Used by the AI to match your writing style.</p>
                  </div>

                  {/* Summary */}
                  {parsed.summary && (
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                      <p className="text-sm text-on-surface leading-relaxed">{parsed.summary}</p>
                    </div>
                  )}

                  {/* Tone & Personality */}
                  {(parsed.tone?.length > 0 || parsed.personality_traits?.length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {(parsed.tone ?? []).map((t: string, i: number) => (
                        <span key={`t${i}`} className="bg-surface-container-highest rounded-full px-3 py-1 text-xs text-on-surface-variant">{t}</span>
                      ))}
                      {(parsed.personality_traits ?? []).map((t: string, i: number) => (
                        <span key={`p${i}`} className="bg-surface-container-highest rounded-full px-3 py-1 text-xs text-on-surface-variant">{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Writing Style */}
                  {parsed.writing_style && (
                    <div className="rounded-lg bg-surface border border-outline-variant/10 px-4 py-3 space-y-1.5 text-xs">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Writing style</p>
                      {parsed.writing_style.sentence_length && (
                        <p><span className="text-on-surface-variant/60">Sentences:</span> <span className="text-on-surface">{parsed.writing_style.sentence_length}</span></p>
                      )}
                      {parsed.writing_style.punctuation && (
                        <p><span className="text-on-surface-variant/60">Punctuation:</span> <span className="text-on-surface">{parsed.writing_style.punctuation}</span></p>
                      )}
                      {parsed.writing_style.capitalization && (
                        <p><span className="text-on-surface-variant/60">Capitalization:</span> <span className="text-on-surface">{parsed.writing_style.capitalization}</span></p>
                      )}
                      {parsed.writing_style.quirks?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {parsed.writing_style.quirks.map((q: string, i: number) => (
                            <span key={i} className="bg-surface-container-highest rounded-full px-3 py-1 text-xs text-on-surface-variant">{q}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Do / Don't */}
                  {(parsed.do?.length > 0 || parsed.dont?.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      {parsed.do?.length > 0 && (
                        <div className="rounded-lg bg-surface border border-outline-variant/10 px-4 py-3 space-y-1.5">
                          <p className="text-[10px] uppercase tracking-widest text-tertiary font-body">Do</p>
                          {parsed.do.map((d: string, i: number) => (
                            <p key={i} className="text-xs text-on-surface-variant">&middot; {d}</p>
                          ))}
                        </div>
                      )}
                      {parsed.dont?.length > 0 && (
                        <div className="rounded-lg bg-surface border border-outline-variant/10 px-4 py-3 space-y-1.5">
                          <p className="text-[10px] uppercase tracking-widest text-error font-body">Don&apos;t</p>
                          {parsed.dont.map((d: string, i: number) => (
                            <p key={i} className="text-xs text-on-surface-variant">&middot; {d}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Phrases */}
                  {parsed.phrases?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.phrases.map((p: string, i: number) => (
                        <span key={i} className="bg-surface-container-highest rounded-full px-3 py-1 text-xs text-on-surface-variant italic">&ldquo;{p}&rdquo;</span>
                      ))}
                    </div>
                  )}

                  {/* Raw JSON editor */}
                  <details>
                    <summary className="text-xs text-on-surface-variant/60 cursor-pointer hover:text-on-surface-variant">Edit raw JSON</summary>
                    <Textarea
                      value={voiceSample}
                      onChange={(e) => setVoiceSample(e.target.value)}
                      rows={12}
                      className="bg-surface mt-2 font-mono text-xs"
                    />
                    <Button
                      onClick={async () => {
                        if (!userId) return
                        setSaving(true)
                        await supabase.from('profiles').update({ voice_sample: voiceSample }).eq('id', userId)
                        setSaving(false)
                        flashSaved()
                      }}
                      disabled={saving}
                      variant="outline"
                      className="mt-2 text-xs"
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </Button>
                  </details>
                </div>
              )
            })()}

            {/* Chat history upload */}
            <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Chat history</label>
                <p className="text-xs text-on-surface-variant/60 mt-1">
                  Upload conversations with clients (.txt files). The AI analyzes your writing patterns and generates a voice profile.
                </p>
              </div>

              {/* Upload button */}
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-outline-variant/30 px-4 py-3 transition-colors hover:border-primary hover:bg-primary/5">
                <Upload className="h-4 w-4 text-on-surface-variant/60" />
                <span className="text-sm text-on-surface-variant">
                  {uploadingChats ? 'Uploading...' : 'Upload .txt files'}
                </span>
                <input
                  type="file"
                  accept=".txt"
                  multiple
                  className="hidden"
                  onChange={handleChatUpload}
                  disabled={uploadingChats}
                />
              </label>

              {/* File list */}
              {chatFiles.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-on-surface-variant/60">{chatFiles.length} file(s)</p>
                  {chatFiles.map((file) => (
                    <div key={file.path} className="flex items-center justify-between rounded-lg border border-outline-variant/10 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-on-surface-variant/60 shrink-0" />
                        <span className="text-sm text-on-surface truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeChatFile(file.path)} className="text-on-surface-variant/60 hover:text-error p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Participant selector */}
              {chatParticipants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Which one is you?</label>
                  <div className="flex flex-wrap gap-2">
                    {chatParticipants.map((name) => (
                      <button
                        key={name}
                        onClick={() => setSelectedParticipant(name)}
                        className={`bg-surface-container-highest rounded-full px-3 py-1 text-xs text-on-surface-variant transition-colors ${
                          selectedParticipant === name
                            ? 'ring-2 ring-primary text-primary'
                            : 'hover:text-on-surface'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Analyze button */}
              {chatFiles.length > 0 && selectedParticipant && (
                <Button onClick={analyzeVoice} disabled={analyzingVoice} variant="outline" className="w-full">
                  {analyzingVoice ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {analyzingVoice ? 'Analyzing your writing style...' : `Analyze voice as "${selectedParticipant}"`}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Platforms */}
        {activeTab === 'platforms' && (
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Connected Platforms</label>
              <a href="/platforms" className="gradient-cta text-on-primary font-semibold px-4 py-2 rounded-full text-xs">Add Platform</a>
            </div>
            {accounts.length === 0 ? (
              <p className="text-sm text-on-surface-variant/60">No platforms connected yet.</p>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-xl bg-surface-container p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: account.platform_color }} />
                      <span className="text-sm font-medium text-on-surface">{account.platform_name}</span>
                    </div>
                    <Select
                      value={account.schedule_json?.frequency ?? ''}
                      onValueChange={(val) => updateSchedule(account.id, val)}
                    >
                      <SelectTrigger className="w-36 bg-surface-container-high border-none text-xs">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1x_daily">1x per day</SelectItem>
                        <SelectItem value="2x_daily">2x per day</SelectItem>
                        <SelectItem value="3x_daily">3x per day</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Listings */}
        {activeTab === 'listings' && (
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Directory Listings</label>
            {listings.length === 0 ? (
              <p className="text-sm text-on-surface-variant/60">No listings yet.</p>
            ) : (
              <div className="space-y-3">
                {listings.map((listing: any) => {
                  const platform = listing.platform_accounts?.platforms
                  const perf = listing.performance ?? {}
                  return (
                    <div key={listing.id} className="flex items-center justify-between rounded-xl bg-surface-container p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: platform?.color ?? '#666' }} />
                        <div>
                          <span className="text-sm font-medium text-on-surface">{platform?.name ?? 'Unknown'}</span>
                          <p className="text-xs text-on-surface-variant capitalize">{listing.status} · {perf.views ?? 0} views · {perf.clicks ?? 0} clicks</p>
                        </div>
                      </div>
                      {listing.listing_url && (
                        <a href={listing.listing_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          View
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Planning */}
        {activeTab === 'planning' && (
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Posting frequency</label>
            <p className="text-sm text-on-surface-variant">Set how often Feathr posts on each platform.</p>
            {accounts.length === 0 ? (
              <p className="text-sm text-on-surface-variant/60">No platforms connected yet.</p>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-lg border border-outline-variant/10 px-4 py-3">
                    <span className="text-sm font-medium" style={{ color: account.platform_color }}>
                      {account.platform_name}
                    </span>
                    <Select
                      value={account.schedule_json?.frequency ?? ''}
                      onValueChange={(val) => updateSchedule(account.id, val)}
                    >
                      <SelectTrigger className="w-40 bg-surface">
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
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-6">
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Notification preferences</label>
            <div className="space-y-3">
              {[
                { label: 'New messages', checked: notifNewMessages, onChange: setNotifNewMessages },
                { label: 'Draft ready for review', checked: notifDraftReady, onChange: setNotifDraftReady },
                { label: 'Lead qualified', checked: notifLeadQualified, onChange: setNotifLeadQualified },
                { label: 'Listing expiring', checked: notifListingExpiring, onChange: setNotifListingExpiring },
              ].map((item) => (
                <label key={item.label} className="flex cursor-pointer items-center justify-between rounded-xl border border-outline-variant/10 px-4 py-3 transition-colors hover:bg-surface-container-highest">
                  <span className="text-sm text-on-surface">{item.label}</span>
                  <Checkbox checked={item.checked} onCheckedChange={(c) => item.onChange(c === true)} />
                </label>
              ))}
            </div>
            <Button onClick={saveNotifications} disabled={saving} className="gradient-cta text-white">
              {saving ? 'Saving...' : 'Save preferences'}
            </Button>
          </div>
        )}

        {/* Account */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Email</label>
                <Input value={userEmail} disabled className="bg-surface opacity-60" />
                <p className="text-xs text-on-surface-variant/60">Contact support to change your email.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body">Password</label>
                <p className="text-sm text-on-surface-variant/60">
                  To change your password, sign out and use the &ldquo;Forgot password&rdquo; flow on the login page.
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-3">
              <h3 className="text-error font-display text-lg">Danger zone</h3>
              <p className="text-xs text-on-surface-variant/60">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                className="border border-error/30 text-error hover:bg-error/10 rounded-full"
              >
                Delete account
              </Button>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent className="bg-surface-container-low border-outline-variant/10 max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-display">Delete account?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-on-surface-variant">
                  This will permanently delete your account, all your data, connected platforms, and content. This cannot be undone.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleDeleteAccount} className="bg-error text-white hover:bg-error/90">
                    Delete my account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Billing */}
        {activeTab === 'billing' && (
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 text-center">
            <p className="text-on-surface-variant text-sm">Billing will be available soon. During early access, Feathr is free.</p>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
