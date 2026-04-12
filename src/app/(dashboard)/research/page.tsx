'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { ResearchReportCard } from '@/components/dashboard/research-report-card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'

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

    // Only show AI-generated reports
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
        <h1 className="text-3xl font-light">Research</h1>
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
        <div className="rounded-lg border border-border bg-bg-surface p-12 text-center">
          <p className="text-text-muted">
            No research reports yet. Click &ldquo;New Research&rdquo; to have your assistant analyze market trends and competitors.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ResearchReportCard
              key={report.id}
              type={report.type}
              title={report.title}
              createdAt={report.created_at}
              body={report.body}
            />
          ))}
        </div>
      )}
    </div>
  )
}
