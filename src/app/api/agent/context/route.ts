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

  if (type === 'prompt-writer') {
    // Get pending queue items with their draft captions
    const { data: queueItems } = await supabase
      .from('foxy_prompt_queue')
      .select('id, draft_id, prompt, aspect_ratio, created_at')
      .eq('profile_id', profileId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    // Get draft captions for context
    const draftIds = (queueItems ?? []).map(q => q.draft_id).filter(Boolean)
    let drafts: Record<string, string> = {}
    if (draftIds.length > 0) {
      const { data: draftRows } = await supabase
        .from('content_calendar')
        .select('id, caption')
        .in('id', draftIds)
      drafts = Object.fromEntries((draftRows ?? []).map(d => [d.id, d.caption ?? '']))
    }

    const enrichedQueue = (queueItems ?? []).map(item => ({
      ...item,
      draft_caption: drafts[item.draft_id] ?? null,
    }))

    // Get prompt templates for reference
    const { data: templates } = await supabase
      .from('foxy_prompt_templates')
      .select('name, category, prompt, notes, quality_rating')
      .gte('quality_rating', 4)
      .order('quality_rating', { ascending: false })
      .limit(15)

    // Get profile info for context (name, niche, style)
    const { data: profile } = await supabase
      .from('profiles')
      .select('professional_name, city, goals, voice_description')
      .eq('id', profileId)
      .single()

    return NextResponse.json({
      profile: {
        name: profile?.professional_name,
        city: profile?.city,
        goals: profile?.goals,
        voice: profile?.voice_description,
      },
      queue_items: enrichedQueue,
      prompt_templates: templates ?? [],
      prompt_formula: {
        structure: '[Photography style], [technical treatment], [shot type + angle]. [Setting with every object named]. Wearing [material + color + fit + construction of garments + accessories]. [Exact body pose: which hand, which foot, weight, gaze direction]. [Light source + color temperature].',
        rules: [
          'Open with a real photography genre — not "photo of" but "Lo-fi flash photography", "Fine art editorial photography"',
          'Specify technical camera details — film grain, ISO, contrast, color grade',
          'State camera angle and shot type explicitly',
          'Describe environment like a set designer — name every object',
          'Describe outfit like a fashion spec sheet — material, fit, color, brand, construction',
          'Describe pose as body mechanics — which hand does what, weight distribution, gaze',
          'Never use AI language — zero "beautiful", "stunning", "gorgeous". Stay clinical',
          'Describe light by source, not mood — "warm tungsten corridor light" not "moody lighting"',
        ],
        anti_ai_tricks: [
          'Film imperfections: grain, motion blur, slight overexposure',
          'Silhouettes: hide AI rendering artifacts',
          'B&W processing: eliminates AI color artifacts',
          'Mirror selfies with phone brand + case color',
          'Wet surfaces: reflections add realism',
          'Environmental clutter: scattered objects, weathering',
          '"UGC type content, photorealistic, matte skin, micro details"',
          'Brand names anchor the image in reality',
          'Human gestures: peace sign, tucking hair, holding bag',
        ],
      },
      carousel_rules: {
        structure: '2 hero shots (full person, slide 1 and final slide) + 3-4 B-roll (POV, hands, legs, close-ups — still her but partial framing). Total 5-6 slides.',
        arc: 'Beginning (hero sets the vibe) → middle (B-roll moments from the day) → payoff (hero glow-up/reveal). Never end on a low note.',
        rules: [
          'Every photo must feel like a real camera roll — selfies, mirror shots, friend-took-it candids, phone-on-timer are all fine',
          'Never mention phone, camera, or "taking a photo" in non-mirror prompts — AI renders it literally',
          'Phone only appears in mirror selfies where it is naturally part of the composition',
          'Every slide must earn its place — spicy, funny, or visually interesting. No boring mundane actions.',
          'B-roll is still HER — partial body (legs, hands, feet, half-face), not objects alone',
          'No weird poses nobody actually does — if you cannot picture a real person doing it, do not prompt it',
          'Same color palette and time of day across all slides',
          'Outfit can progress naturally (casual → dressed up) but visual thread must connect slides',
          'All aspect ratios 4/5 (Instagram portrait)',
        ],
        broll_types: [
          'POV looking down: legs in bathtub, outfit check, lap with something on it',
          'Hand close-up: holding a drink, food, adjusting jewelry — one hand doing something interesting',
          'Half-face / partial selfie: behind a mug, peeking over sunglasses, half hidden',
          'Legs / feet: natural positions like poolside, dangling from countertop, feet in surf',
        ],
      },
    })
  }

  return NextResponse.json({ error: 'Unknown context type. Use: research, content-writer, prompt-writer' }, { status: 400 })
}
