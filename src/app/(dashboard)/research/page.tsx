'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { ResearchReportCard } from '@/components/dashboard/research-report-card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Search } from 'lucide-react'

type Report = Database['public']['Tables']['research_reports']['Row']

function isAgentReport(body: any): boolean {
  return !!(body?.summary || body?.content_ideas || body?.trending_topics || body?.competitor_strategies)
}

export default function ResearchPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  async function loadReports() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('research_reports')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })

    const aiReports = (data ?? []).filter((r) => isAgentReport(r.body))
    setReports(aiReports)
    setLoading(false)
  }

  useEffect(() => { loadReports() }, [])

  async function handleNewResearch() {
    setTriggering(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Step 1: Sync fresh data from Twitter
      console.log('[research] Syncing Twitter data...')
      const syncRes = await fetch('/api/research/sync', { method: 'POST' })
      const syncData = await syncRes.json()
      console.log('[research] Sync result:', syncData)

      // Step 2: Trigger Research Agent to analyze the data
      console.log('[research] Triggering Research Agent...')
      const res = await fetch('/api/agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'research',
          profile_id: user.id,
          title: 'Research market trends and competitors',
        }),
      })

      const data = await res.json()
      if (res.ok) {
        console.log('[research] Triggered research agent:', data.identifier)
      } else {
        console.error('[research] Failed to trigger:', data)
      }
    } catch (err) {
      console.error('[research] Error triggering:', err)
    } finally {
      setTriggering(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light">Research</h1>
          {reports.length > 0 && (
            <p className="text-sm text-text-muted mt-1">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <Button onClick={handleNewResearch} disabled={triggering} className="text-xs">
          {triggering ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          )}
          {triggering ? 'Starting...' : 'New Research'}
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-surface p-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Search className="h-6 w-6 text-accent" />
          </div>
          <p className="text-text-primary font-medium">No research reports yet</p>
          <p className="text-sm text-text-muted mt-1.5 max-w-sm mx-auto">
            Click &ldquo;New Research&rdquo; to have your assistant analyze market trends, competitor strategies, and content opportunities.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report, i) => (
            <ResearchReportCard
              key={report.id}
              type={report.type}
              title={report.title}
              createdAt={report.created_at}
              body={report.body}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
