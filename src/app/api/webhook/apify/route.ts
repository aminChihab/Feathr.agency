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

  const runId = body.resource?.id ?? body.eventData?.actorRunId
  const status = body.resource?.status ?? body.eventData?.status

  console.log(`[apify-webhook] Run ${runId} status: ${status}`)

  if (!runId || status !== 'SUCCEEDED') {
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
  const handle = reportBody.handle
  const term = reportBody.term

  console.log(`[apify-webhook] Processing results for ${handle ? `@${handle}` : term}`)

  // Fetch results from Apify
  const datasetId = body.resource?.defaultDatasetId
  if (!datasetId) {
    console.error('[apify-webhook] No dataset ID in webhook payload')
    return NextResponse.json({ ok: true })
  }

  const resultsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  )

  if (!resultsRes.ok) {
    console.error('[apify-webhook] Failed to fetch results:', resultsRes.status)
    return NextResponse.json({ ok: true })
  }

  const results = await resultsRes.json()
  console.log(`[apify-webhook] Got ${results.length} results`)

  if (report.type === 'competitor' && handle) {
    // Competitor profile scrape
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

    await supabase.from('research_reports').update({
      title: `IG Competitor: @${handle}`,
      body: {
        handle,
        platform: 'instagram',
        scraped_at: new Date().toISOString(),
        status: 'completed',
        apify_run_id: runId,
        profile: {
          display_name: first?.ownerFullName ?? handle,
          bio: first?.ownerBio ?? '',
          followers: first?.ownerFollowerCount ?? 0,
          following: first?.ownerFollowingCount ?? 0,
          post_count: first?.ownerPostCount ?? 0,
        },
        recent_posts: recentPosts,
      },
    }).eq('id', report.id)

    console.log(`[apify-webhook] @${handle}: saved ${recentPosts.length} posts`)
    await createNotification(report.profile_id, 'system', `IG research: @${handle} scraped (${recentPosts.length} posts)`)

  } else if (report.type === 'trend' && term) {
    // Hashtag scrape
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

    await supabase.from('research_reports').update({
      title: `IG Trending: ${term}`,
      body: {
        term,
        platform: 'instagram',
        scraped_at: new Date().toISOString(),
        status: 'completed',
        apify_run_id: runId,
        post_count: posts.length,
        posts,
      },
    }).eq('id', report.id)

    console.log(`[apify-webhook] ${term}: saved ${posts.length} posts`)
    await createNotification(report.profile_id, 'system', `IG research: ${term} scraped (${posts.length} posts)`)
  }

  return NextResponse.json({ ok: true })
}
