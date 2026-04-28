import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAgentAuthorized } from '@/lib/agent-auth'

// POST /api/agent/notifications — Agent creates a notification
export async function POST(request: NextRequest) {
  if (!isAgentAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, type, title, body: notifBody } = body

  if (!profile_id || !type || !title) {
    return NextResponse.json({ error: 'Missing profile_id, type, or title' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({ profile_id, type, title, body: notifBody ?? {} })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
