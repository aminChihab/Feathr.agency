import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const APIFY_ACTOR = 'apify~instagram-scraper'

async function runApifyScraper(input: any): Promise<any[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[ig-sync] Apify error:', res.status, err.slice(0, 200))
    return []
  }

  return await res.json()
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!APIFY_TOKEN) {
    return NextResponse.json({ error: 'APIFY_API_TOKEN not configured' }, { status: 500 })
  }

  console.log('[ig-sync] Starting for user:', user.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .single()

  const settings = (profile?.settings as any) ?? {}
  const competitorHandles: string[] = settings.instagram_handles ?? []
  const searchTerms: string[] = settings.instagram_terms ?? []

  console.log('[ig-sync] Competitor handles:', competitorHandles.join(', ') || 'none')
  console.log('[ig-sync] Search terms:', searchTerms.join(', ') || 'none')

  if (competitorHandles.length === 0 && searchTerms.length === 0) {
    return NextResponse.json({ competitor_reports: 0, hashtag_reports: 0, message: 'No Instagram targets configured' })
  }

  let competitorReports = 0
  let hashtagReports = 0
  const errors: string[] = []

  // Scrape competitor profiles
  for (const handle of competitorHandles) {
    try {
      console.log(`[ig-sync] Scraping @${handle}...`)

      const results = await runApifyScraper({
        directUrls: [`https://www.instagram.com/${handle}/`],
        resultsType: 'posts',
        resultsLimit: 12,
      })

      if (results.length === 0) {
        console.log(`[ig-sync] @${handle}: no results`)
        errors.push(`@${handle}: no results`)
        continue
      }

      // Extract profile info from first result
      const first = results[0]
      const recentPosts = results.map((post: any) => ({
        caption: post.caption ?? '',
        timestamp: post.timestamp,
        likes: post.likesCount ?? 0,
        comments: post.commentsCount ?? 0,
        media_type: post.type ?? 'Image',
        permalink: post.url,
        hashtags: post.hashtags ?? [],
      }))

      console.log(`[ig-sync] @${handle}: ${recentPosts.length} posts scraped`)

      await supabase.from('research_reports').insert({
        profile_id: user.id,
        type: 'competitor',
        title: `IG Competitor: @${handle}`,
        body: {
          handle,
          platform: 'instagram',
          scraped_at: new Date().toISOString(),
          profile: {
            display_name: first.ownerFullName ?? handle,
            bio: first.ownerBio ?? '',
            followers: first.ownerFollowerCount ?? 0,
            following: first.ownerFollowingCount ?? 0,
            post_count: first.ownerPostCount ?? 0,
          },
          recent_posts: recentPosts,
        },
      })

      competitorReports++
    } catch (err) {
      console.error(`[ig-sync] @${handle}: exception:`, err)
      errors.push(`@${handle}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Scrape hashtags
  for (const term of searchTerms) {
    try {
      const cleanTag = term.replace(/^#/, '').toLowerCase()
      console.log(`[ig-sync] Scraping #${cleanTag}...`)

      const results = await runApifyScraper({
        directUrls: [`https://www.instagram.com/explore/tags/${cleanTag}/`],
        resultsType: 'posts',
        resultsLimit: 20,
      })

      if (results.length === 0) {
        console.log(`[ig-sync] #${cleanTag}: no results`)
        errors.push(`#${cleanTag}: no results`)
        continue
      }

      const posts = results.map((post: any) => ({
        caption: post.caption ?? '',
        timestamp: post.timestamp,
        likes: post.likesCount ?? 0,
        comments: post.commentsCount ?? 0,
        media_type: post.type ?? 'Image',
        permalink: post.url,
        owner: post.ownerUsername ?? '',
        hashtags: post.hashtags ?? [],
      }))

      console.log(`[ig-sync] #${cleanTag}: ${posts.length} posts scraped`)

      await supabase.from('research_reports').insert({
        profile_id: user.id,
        type: 'trend',
        title: `IG Trending: #${cleanTag}`,
        body: {
          term: `#${cleanTag}`,
          platform: 'instagram',
          scraped_at: new Date().toISOString(),
          post_count: posts.length,
          posts,
        },
      })

      hashtagReports++
    } catch (err) {
      console.error(`[ig-sync] ${term}: exception:`, err)
      errors.push(`${term}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  console.log(`[ig-sync] Done: ${competitorReports} competitor, ${hashtagReports} hashtag, ${errors.length} errors`)

  return NextResponse.json({
    competitor_reports: competitorReports,
    hashtag_reports: hashtagReports,
    errors: errors.length > 0 ? errors : undefined,
  })
}
