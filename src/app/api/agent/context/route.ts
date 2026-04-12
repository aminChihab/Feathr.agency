import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/agent/context?type=research&profile_id=xxx
// Returns context data for agents to use
export async function GET(request: NextRequest) {
  // Verify agent secret
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type')
  const profileId = request.nextUrl.searchParams.get('profile_id')

  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (type === 'research') {
    // Get profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('professional_name, city, goals, voice_description, settings')
      .eq('id', profileId)
      .single()

    // Get latest research reports (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: reports } = await supabase
      .from('research_reports')
      .select('type, title, body, created_at')
      .eq('profile_id', profileId)
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get analytics (last 14 days)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: analytics } = await supabase
      .from('analytics')
      .select('date, followers, impressions, engagement, platform_accounts(platforms(name, slug))')
      .eq('profile_id', profileId)
      .gte('date', twoWeeksAgo)
      .order('date', { ascending: false })

    // Get recent posts performance
    const { data: recentPosts } = await supabase
      .from('content_calendar')
      .select('caption, status, scheduled_at, posted_at, platform_accounts(platforms(name))')
      .eq('profile_id', profileId)
      .eq('status', 'posted')
      .order('posted_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      profile: {
        name: profile?.professional_name,
        city: profile?.city,
        goals: profile?.goals,
        voice: profile?.voice_description,
        research_terms: (profile?.settings as any)?.research_terms ?? [],
        competitor_handles: (profile?.settings as any)?.competitor_handles ?? [],
      },
      research_reports: reports ?? [],
      analytics: analytics ?? [],
      recent_posts: recentPosts ?? [],
    })
  }

  if (type === 'content-writer') {
    // Get profile + voice
    const { data: profile } = await supabase
      .from('profiles')
      .select('professional_name, city, goals, voice_description')
      .eq('id', profileId)
      .single()

    // Get latest research reports for content ideas
    const { data: reports } = await supabase
      .from('research_reports')
      .select('type, title, body, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get connected platforms
    const { data: platforms } = await supabase
      .from('platform_accounts')
      .select('id, username, schedule_json, platforms(name, slug, capabilities)')
      .eq('profile_id', profileId)
      .eq('status', 'connected')

    // Get recent posts to avoid repetition
    const { data: recentPosts } = await supabase
      .from('content_calendar')
      .select('caption, media_ids, platform_accounts(platforms(name))')
      .eq('profile_id', profileId)
      .in('status', ['posted', 'approved', 'draft'])
      .order('created_at', { ascending: false })
      .limit(30)

    // Collect all media IDs already used in posts
    const usedMediaIds = new Set<string>()
    for (const post of recentPosts ?? []) {
      const ids = (post as any).media_ids as string[] | null
      if (ids) ids.forEach((id: string) => usedMediaIds.add(id))
    }

    // Get media library with descriptions — exclude already-used media
    const { data: mediaItems } = await supabase
      .from('content_library')
      .select('id, file_name, file_type, tags, metadata')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50)

    const media = (mediaItems ?? [])
      .filter((item) => !usedMediaIds.has(item.id))
      .map((item) => ({
        id: item.id,
        file_name: item.file_name,
        file_type: item.file_type,
        tags: item.tags,
        description: (item.metadata as any)?.description ?? null,
      }))

    return NextResponse.json({
      profile: {
        name: profile?.professional_name,
        city: profile?.city,
        goals: profile?.goals,
        voice: profile?.voice_description,
      },
      research_reports: reports ?? [],
      platforms: platforms ?? [],
      recent_posts: recentPosts ?? [],
      media,
    })
  }

  return NextResponse.json({ error: 'Unknown context type. Use: research, content-writer' }, { status: 400 })
}
