import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/agent/performance?profile_id=xxx — Performance data for analysis
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profileId = request.nextUrl.searchParams.get('profile_id')
  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Posted content with platform info
  const { data: postedItems } = await supabase
    .from('content_calendar')
    .select('id, caption, media_ids, scheduled_at, posted_at, status, platform_accounts(platforms(name, slug))')
    .eq('profile_id', profileId)
    .eq('status', 'posted')
    .gte('posted_at', thirtyDaysAgo)
    .order('posted_at', { ascending: false })

  // Posts table with engagement metrics
  const { data: postMetrics } = await supabase
    .from('posts')
    .select('calendar_item_id, post_url, impressions, engagement, clicks, platform_accounts(platforms(name, slug))')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Analytics — daily stats
  const { data: analytics } = await supabase
    .from('analytics')
    .select('date, followers, impressions, engagement, platform_accounts(platforms(name, slug))')
    .eq('profile_id', profileId)
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: false })

  // Media metadata for posted items
  const allMediaIds = new Set<string>()
  for (const item of postedItems ?? []) {
    const ids = item.media_ids as string[] | null
    if (ids) ids.forEach((id) => allMediaIds.add(id))
  }

  let mediaInfo: any[] = []
  if (allMediaIds.size > 0) {
    const { data } = await supabase
      .from('content_library')
      .select('id, file_type, tags, metadata')
      .in('id', Array.from(allMediaIds))
    mediaInfo = (data ?? []).map((m) => ({
      id: m.id,
      file_type: m.file_type,
      tags: m.tags,
      description: (m.metadata as any)?.description ?? null,
    }))
  }

  // Current follower counts per platform
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('id, username, metadata, platforms(name, slug)')
    .eq('profile_id', profileId)
    .eq('status', 'connected')

  return NextResponse.json({
    posted_items: postedItems ?? [],
    post_metrics: postMetrics ?? [],
    analytics: analytics ?? [],
    media_info: mediaInfo,
    accounts: accounts ?? [],
  })
}

// POST /api/agent/performance — Save performance_rules
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, performance_rules } = body

  if (!profile_id || !performance_rules) {
    return NextResponse.json({ error: 'Missing profile_id or performance_rules' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('profiles')
    .update({ performance_rules })
    .eq('id', profile_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
