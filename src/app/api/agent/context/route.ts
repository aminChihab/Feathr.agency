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

    // Get latest research reports with sections
    const { data: reports } = await supabase
      .from('research_reports')
      .select('id, report_type, title, summary, created_at, research_report_sections(section_type, title, content, sort_order)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get latest scraped data
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: scrapedData } = await supabase
      .from('research_scraped')
      .select('id, platform, data_type, handle, term, display_name, bio, followers, following, post_count, scraped_at, research_scraped_posts(caption, permalink, media_type, likes, comments, views, hashtags, posted_at)')
      .eq('profile_id', profileId)
      .gte('scraped_at', weekAgo)
      .order('scraped_at', { ascending: false })
      .limit(30)

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
      scraped_data: scrapedData ?? [],
      analytics: analytics ?? [],
      recent_posts: recentPosts ?? [],
    })
  }

  if (type === 'content-writer') {
    // Get profile + voice + performance rules
    const { data: profile } = await supabase
      .from('profiles')
      .select('professional_name, city, goals, voice_description, voice_sample, performance_rules')
      .eq('id', profileId)
      .single()

    // Get latest research reports for content ideas
    const { data: reports } = await supabase
      .from('research_reports')
      .select('id, report_type, title, summary, created_at, research_report_sections(section_type, title, content, sort_order)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Extract latest strategy reports by type
    const latestXStrategy = reports?.find((r) => r.report_type === 'x_strategy')
    const latestIGStrategy = reports?.find((r) => r.report_type === 'ig_strategy')

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
        voice_description: profile?.voice_description,
        voice_sample: profile?.voice_sample,
      },
      performance_rules: profile?.performance_rules ?? null,
      latest_x_strategy: latestXStrategy ?? null,
      latest_ig_strategy: latestIGStrategy ?? null,
      research_reports: reports ?? [],
      platforms: platforms ?? [],
      recent_posts: recentPosts ?? [],
      media,
    })
  }

  return NextResponse.json({ error: 'Unknown context type. Use: research, content-writer' }, { status: 400 })
}
