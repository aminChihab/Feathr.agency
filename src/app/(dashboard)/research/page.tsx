'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { ResearchReportCard } from '@/components/dashboard/research-report-card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

type Report = Database['public']['Tables']['research_reports']['Row']

export default function ResearchPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'trend' | 'competitor'>('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('research_reports')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })

      setReports(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSync() {
    setSyncing(true)
    const res = await fetch('/api/research/sync', { method: 'POST' })
    const data = await res.json()
    console.log('[research] Sync result:', data)

    // Reload reports
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: fresh } = await supabase
        .from('research_reports')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
      setReports(fresh ?? [])
    }
    setSyncing(false)
  }

  const filtered = filter === 'all'
    ? reports
    : reports.filter((r) => r.type === filter)

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
        <Button variant="outline" onClick={handleSync} disabled={syncing} className="text-xs">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync'}
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'trend', 'competitor'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {f === 'all' ? 'All' : f === 'trend' ? 'Trending' : 'Competitors'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-surface p-12 text-center">
          <p className="text-text-muted">
            No research reports yet. Reports will appear here when your research scraper runs.
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Configure search terms and competitor handles in Settings &rarr; Research.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
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
