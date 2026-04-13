import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notify'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/agent/report — Agent writes a research report
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, type, title, report } = body

  if (!profile_id || !type || !title || !report) {
    return NextResponse.json({ error: 'Missing fields: profile_id, type, title, report' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('research_reports')
    .insert({
      profile_id,
      type,
      title,
      body: report,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const reportType = (report as any)?.type
  const notifTitle = reportType === 'x_strategy' ? 'New X/Twitter strategy report'
    : reportType === 'ig_strategy' ? 'New Instagram strategy report'
    : reportType === 'performance' ? 'New performance analysis'
    : `New research report: ${title}`
  await createNotification(profile_id, 'system', notifTitle, { report_id: data.id, report_type: reportType })

  return NextResponse.json({ id: data.id, message: 'Report saved' })
}
