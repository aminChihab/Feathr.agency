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
  User, Mic, Link2, Calendar, Bell, Shield, CreditCard, Search,
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
  { id: 'planning', label: 'Planning', icon: Calendar },
  { id: 'research', label: 'Research', icon: Search },
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
    // WhatsApp format: "dd/mm/yyyy, hh:mm - Name: message"
    // Also: "[dd/mm/yyyy, hh:mm:ss] Name: message"
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

      // Read file to extract participants
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
          <div className="space-y-8">
            {/* Voice description */}
            <div className="space-y-3">
              <div>
                <Label>Voice profile</Label>
                <p className="text-xs text-text-muted mt-1">
                  This shapes how your AI-written content sounds. You can edit it manually or generate it from chat history below.
                </p>
              </div>

              {/* Render JSON voice nicely if it's JSON, otherwise show textarea */}
              {(() => {
                let parsed: any = null
                try { parsed = JSON.parse(voiceDescription) } catch {}

                if (parsed && typeof parsed === 'object') {
                  return (
                    <div className="space-y-3">
                      {/* Summary */}
                      {parsed.summary && (
                        <div className="rounded-lg bg-accent/5 border border-accent/10 p-4">
                          <p className="text-sm text-text-primary leading-relaxed">{parsed.summary}</p>
                        </div>
                      )}

                      {/* Tone & Personality */}
                      <div className="flex flex-wrap gap-1.5">
                        {(parsed.tone ?? []).map((t: string, i: number) => (
                          <span key={i} className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">{t}</span>
                        ))}
                        {(parsed.personality_traits ?? []).map((t: string, i: number) => (
                          <span key={i} className="rounded-full bg-status-scheduled/10 px-2.5 py-0.5 text-xs text-status-scheduled">{t}</span>
                        ))}
                      </div>

                      {/* Writing Style */}
                      {parsed.writing_style && (
                        <div className="rounded-lg bg-bg-base border border-border/50 px-4 py-3 space-y-1.5 text-xs">
                          <p className="text-text-muted font-medium uppercase tracking-wider text-[10px]">Writing style</p>
                          {parsed.writing_style.sentence_length && (
                            <p><span className="text-text-muted">Sentences:</span> <span className="text-text-primary">{parsed.writing_style.sentence_length}</span></p>
                          )}
                          {parsed.writing_style.punctuation && (
                            <p><span className="text-text-muted">Punctuation:</span> <span className="text-text-primary">{parsed.writing_style.punctuation}</span></p>
                          )}
                          {parsed.writing_style.capitalization && (
                            <p><span className="text-text-muted">Capitalization:</span> <span className="text-text-primary">{parsed.writing_style.capitalization}</span></p>
                          )}
                          {parsed.writing_style.quirks?.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {parsed.writing_style.quirks.map((q: string, i: number) => (
                                <span key={i} className="rounded bg-bg-elevated px-2 py-0.5 text-[11px] text-text-secondary">{q}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Do / Don't */}
                      {(parsed.do?.length > 0 || parsed.dont?.length > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                          {parsed.do?.length > 0 && (
                            <div className="rounded-lg bg-bg-base border border-border/50 px-4 py-3 space-y-1.5">
                              <p className="text-[10px] text-status-scheduled font-medium uppercase tracking-wider">Do</p>
                              {parsed.do.map((d: string, i: number) => (
                                <p key={i} className="text-xs text-text-secondary">· {d}</p>
                              ))}
                            </div>
                          )}
                          {parsed.dont?.length > 0 && (
                            <div className="rounded-lg bg-bg-base border border-border/50 px-4 py-3 space-y-1.5">
                              <p className="text-[10px] text-status-failed font-medium uppercase tracking-wider">Don&apos;t</p>
                              {parsed.dont.map((d: string, i: number) => (
                                <p key={i} className="text-xs text-text-secondary">· {d}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Phrases */}
                      {parsed.phrases?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {parsed.phrases.map((p: string, i: number) => (
                            <span key={i} className="rounded-full bg-bg-elevated px-2.5 py-0.5 text-xs text-text-secondary italic">&ldquo;{p}&rdquo;</span>
                          ))}
                        </div>
                      )}

                      {/* Raw JSON editor toggle */}
                      <details className="group">
                        <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">Edit raw JSON</summary>
                        <Textarea
                          value={voiceDescription}
                          onChange={(e) => setVoiceDescription(e.target.value)}
                          rows={12}
                          className="bg-bg-surface mt-2 font-mono text-xs"
                        />
                      </details>
                    </div>
                  )
                }

                // Plain text fallback
                return (
                  <Textarea
                    value={voiceDescription}
                    onChange={(e) => setVoiceDescription(e.target.value)}
                    rows={6}
                    className="bg-bg-surface"
                    placeholder="Describe how you communicate — your tone, humor, boundaries, and style..."
                  />
                )
              })()}

              <Button onClick={saveVoice} disabled={saving} className="bg-accent text-white hover:bg-accent-hover">
                {saving ? 'Saving...' : 'Save voice'}
              </Button>
            </div>

            {/* Chat history upload */}
            <div className="space-y-3 border-t border-border pt-6">
              <div>
                <Label>Chat history</Label>
                <p className="text-xs text-text-muted mt-1">
                  Upload conversations with clients (.txt files). The AI analyzes your writing patterns and generates a voice profile.
                </p>
              </div>

              {/* Upload button */}
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 transition-colors hover:border-accent hover:bg-accent/5">
                <Upload className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text-secondary">
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
                  <p className="text-xs text-text-muted">{chatFiles.length} file(s)</p>
                  {chatFiles.map((file) => (
                    <div key={file.path} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-text-muted shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeChatFile(file.path)} className="text-text-muted hover:text-status-failed p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Participant selector */}
              {chatParticipants.length > 0 && (
                <div className="space-y-2">
                  <Label>Which one is you?</Label>
                  <div className="flex flex-wrap gap-2">
                    {chatParticipants.map((name) => (
                      <button
                        key={name}
                        onClick={() => setSelectedParticipant(name)}
                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                          selectedParticipant === name
                            ? 'bg-accent text-white'
                            : 'bg-bg-base border border-border text-text-secondary hover:border-accent'
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

        {/* Research */}
        {activeTab === 'research' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <Label>Search terms</Label>
              <p className="text-xs text-text-muted">Keywords and hashtags to monitor for trending content.</p>
              <div className="flex gap-2">
                <Input
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="e.g. escort amsterdam"
                  className="bg-bg-surface"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTerm.trim()) {
                      setResearchTerms(prev => [...prev, newTerm.trim()])
                      setNewTerm('')
                    }
                  }}
                />
                <Button variant="outline" onClick={() => { if (newTerm.trim()) { setResearchTerms(prev => [...prev, newTerm.trim()]); setNewTerm('') } }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {researchTerms.map((term, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1 text-xs">
                    {term}
                    <button onClick={() => setResearchTerms(prev => prev.filter((_, j) => j !== i))} className="text-text-muted hover:text-status-failed">×</button>
                  </span>
                ))}
              </div>
              <Button
                variant="ghost"
                className="text-xs text-text-muted"
                onClick={() => {
                  setResearchTerms(DEFAULT_TERMS)
                  setCompetitorHandles(DEFAULT_HANDLES)
                }}
              >
                Load suggested defaults
              </Button>
            </div>

            <div className="space-y-4">
              <Label>Competitor handles</Label>
              <p className="text-xs text-text-muted">Twitter/X profiles to monitor for content ideas.</p>
              <div className="flex gap-2">
                <Input
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  placeholder="@handle"
                  className="bg-bg-surface"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newHandle.trim()) {
                      setCompetitorHandles(prev => [...prev, newHandle.trim().replace(/^@/, '')])
                      setNewHandle('')
                    }
                  }}
                />
                <Button variant="outline" onClick={() => { if (newHandle.trim()) { setCompetitorHandles(prev => [...prev, newHandle.trim().replace(/^@/, '')]); setNewHandle('') } }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {competitorHandles.map((handle, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1 text-xs">
                    @{handle}
                    <button onClick={() => setCompetitorHandles(prev => prev.filter((_, j) => j !== i))} className="text-text-muted hover:text-status-failed">×</button>
                  </span>
                ))}
              </div>
            </div>

            <Button onClick={saveResearch} disabled={saving} className="bg-accent text-white hover:bg-accent-hover">
              {saving ? 'Saving...' : 'Save research settings'}
            </Button>
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
