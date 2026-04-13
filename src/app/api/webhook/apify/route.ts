import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notify'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const APIFY_TOKEN = process.env.APIFY_API_TOKEN

// POST /api/webhook/apify — Called by Apify when a scrape run completes
export async function POST(request: NextRequest) {
  const body = await request.json()

  console.log('[apify-webhook] Received:', JSON.stringify(body).slice(0, 500))

  const eventType = body.eventType
  const runId = body.resource?.id ?? body.eventData?.actorRunId

  console.log(`[apify-webhook] Event: ${eventType}, Run: ${runId}`)

  if (!runId || eventType !== 'ACTOR.RUN.SUCCEEDED') {
    console.log('[apify-webhook] Ignoring non-success event')
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // Find the pending report for this run
  const { data: pendingReports } = await supabase
    .from('research_reports')
    .select('id, profile_id, type, body')
    .filter('body->>apify_run_id', 'eq', runId)
    .filter('body->>status', 'eq', 'pending')

  if (!pendingReports || pendingReports.length === 0) {
    console.log(`[apify-webhook] No pending report found for run ${runId}`)
    return NextResponse.json({ ok: true })
  }

  const report = pendingReports[0]
  const reportBody = report.body as any
  const handles: string[] = reportBody.handles ?? []
  const terms: string[] = reportBody.terms ?? []

  console.log(`[apify-webhook] Processing: ${handles.length} handles, ${terms.length} terms`)

  // Get run details to find dataset ID
  const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)
  if (!runRes.ok) {
    console.error('[apify-webhook] Failed to get run details:', runRes.status)
    return NextResponse.json({ ok: true })
  }

  const runData = await runRes.json()
  const datasetId = runData.data?.defaultDatasetId
  if (!datasetId) {
    console.error('[apify-webhook] No dataset ID')
    return NextResponse.json({ ok: true })
  }

  // Fetch all results
  const resultsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`)
  if (!resultsRes.ok) {
    console.error('[apify-webhook] Failed to fetch results:', resultsRes.status)
    return NextResponse.json({ ok: true })
  }

  const allResults = await resultsRes.json()
  console.log(`[apify-webhook] Got ${allResults.length} total results`)

  // Group results by source URL (owner for profiles, hashtag page for terms)
  // Posts from a profile have ownerUsername, posts from hashtag pages have various owners
  const byOwner = new Map<string, any[]>()
  const hashtagPosts: any[] = []

  for (const post of allResults) {
    const owner = (post.ownerUsername ?? '').toLowerCase()
    const isFromTrackedHandle = handles.some((h) => h.toLowerCase() === owner)

    if (isFromTrackedHandle) {
      if (!byOwner.has(owner)) byOwner.set(owner, [])
      byOwner.get(owner)!.push(post)
    } else {
      // Posts from hashtag pages (various owners)
      hashtagPosts.push(post)
    }
  }

  let competitorReports = 0
  let hashtagReports = 0

  // Create competitor reports
  for (const handle of handles) {
    const posts = byOwner.get(handle.toLowerCase()) ?? []
    if (posts.length === 0) {
      console.log(`[apify-webhook] @${handle}: no posts found`)
      continue
    }

    const first = posts[0]
    const recentPosts = posts.map((post: any) => ({
      caption: post.caption ?? '',
      timestamp: post.timestamp,
      likes: post.likesCount ?? 0,
      comments: post.commentsCount ?? 0,
      media_type: post.type ?? 'Image',
      permalink: post.url,
      hashtags: post.hashtags ?? [],
    }))

    await supabase.from('research_reports').insert({
      profile_id: report.profile_id,
      type: 'competitor',
      title: `IG Competitor: @${handle}`,
      body: {
        handle,
        platform: 'instagram',
        scraped_at: new Date().toISOString(),
        profile: {
          display_name: first?.ownerFullName ?? handle,
          bio: first?.ownerBio ?? '',
          followers: first?.ownerFollowerCount ?? 0,
          following: first?.ownerFollowingCount ?? 0,
          post_count: first?.ownerPostCount ?? 0,
        },
        recent_posts: recentPosts,
      },
    })

    competitorReports++
    console.log(`[apify-webhook] @${handle}: ${recentPosts.length} posts saved`)
  }

  // Create hashtag reports — group by hashtag from the terms list
  if (terms.length > 0 && hashtagPosts.length > 0) {
    // If we only have one term, all hashtag posts belong to it
    // If multiple terms, we can't perfectly distinguish — group them all per term based on hashtag presence
    for (const term of terms) {
      const matchingPosts = terms.length === 1
        ? hashtagPosts
        : hashtagPosts.filter((p) => {
            const tags = (p.hashtags ?? []).map((t: string) => t.toLowerCase())
            return tags.includes(term.toLowerCase())
          })

      if (matchingPosts.length === 0) continue

      const posts = matchingPosts.map((post: any) => ({
        caption: post.caption ?? '',
        timestamp: post.timestamp,
        likes: post.likesCount ?? 0,
        comments: post.commentsCount ?? 0,
        media_type: post.type ?? 'Image',
        permalink: post.url,
        owner: post.ownerUsername ?? '',
        hashtags: post.hashtags ?? [],
      }))

      await supabase.from('research_reports').insert({
        profile_id: report.profile_id,
        type: 'trend',
        title: `IG Trending: #${term}`,
        body: {
          term: `#${term}`,
          platform: 'instagram',
          scraped_at: new Date().toISOString(),
          post_count: posts.length,
          posts,
        },
      })

      hashtagReports++
      console.log(`[apify-webhook] #${term}: ${posts.length} posts saved`)
    }
  }

  // Update the pending report to completed
  await supabase.from('research_reports').update({
    title: `IG Research: ${competitorReports} profiles, ${hashtagReports} hashtags`,
    body: {
      ...reportBody,
      status: 'completed',
      scraped_at: new Date().toISOString(),
      total_results: allResults.length,
      competitor_reports: competitorReports,
      hashtag_reports: hashtagReports,
    },
  }).eq('id', report.id)

  const total = competitorReports + hashtagReports
  await createNotification(
    report.profile_id,
    'system',
    `IG research complete: ${competitorReports} profiles, ${hashtagReports} hashtags (${allResults.length} posts total)`
  )

  console.log(`[apify-webhook] Done: ${competitorReports} competitors, ${hashtagReports} hashtags`)

  return NextResponse.json({ ok: true, competitors: competitorReports, hashtags: hashtagReports })
}
