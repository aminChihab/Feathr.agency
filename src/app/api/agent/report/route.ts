import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAgentAuthorized } from '@/lib/agent-auth'
import { createNotification } from '@/lib/notify'

// POST /api/agent/report — Agent saves a research report with sections
// Body: { profile_id, report_type, title, summary, sections: [{ section_type, title, content }] }
export async function POST(request: NextRequest) {
  if (!isAgentAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, report_type, title, summary, sections } = body

  if (!profile_id || !report_type || !title) {
    return NextResponse.json({ error: 'Missing fields: profile_id, report_type, title' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Create report
  const { data: report, error: reportError } = await supabase
    .from('research_reports')
    .insert({ profile_id, report_type, title, summary: summary ?? null })
    .select('id')
    .single()

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 })
  }

  // Create sections
  if (sections && Array.isArray(sections) && sections.length > 0) {
    const sectionRows = sections.map((s: any, i: number) => ({
      report_id: report.id,
      section_type: s.section_type ?? 'general',
      title: s.title ?? `Section ${i + 1}`,
      content: s.content ?? '',
      sort_order: i,
    }))

    const { error: sectionsError } = await supabase
      .from('research_report_sections')
      .insert(sectionRows)

    if (sectionsError) {
      console.error('[report] Failed to insert sections:', sectionsError.message)
    }
  }

  // Notification
  const notifTitle = report_type === 'x_strategy' ? 'New X/Twitter strategy report'
    : report_type === 'ig_strategy' ? 'New Instagram strategy report'
    : report_type === 'performance' ? 'New performance analysis'
    : `New report: ${title}`
  await createNotification(profile_id, 'system', notifTitle, { report_id: report.id })

  return NextResponse.json({ id: report.id, message: 'Report saved' })
}
