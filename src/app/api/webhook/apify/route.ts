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

  const eventType = body.eventType
  const runId = body.resource?.id ?? body.eventData?.actorRunId

  console.log(`[apify-webhook] Event: ${eventType}, Run: ${runId}`)

  if (!runId || eventType !== 'ACTOR.RUN.SUCCEEDED') {
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

  // Get dataset
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

  const resultsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`)
  if (!resultsRes.ok) {
    console.error('[apify-webhook] Failed to fetch results:', resultsRes.status)
    return NextResponse.json({ ok: true })
  }

  const allResults = await resultsRes.json()
  console.log(`[apify-webhook] Got ${allResults.length} results`)

  let competitorReports = 0
  let hashtagReports = 0

  for (const item of allResults) {
    // Detect item type by checking fields
    const inputUrl = (item.inputUrl ?? item.url ?? '').toLowerCase()

    if (item.username && (item.fullName !== undefined || item.biography !== undefined)) {
      // This is a PROFILE result
      const handle = item.username
      console.log(`[apify-webhook] Profile: @${handle}, followers: ${item.followersCount ?? item.followedBy ?? 0}, posts: ${(item.latestPosts ?? []).length}`)

      const recentPosts = (item.latestPosts ?? []).map((post: any) => ({
        caption: post.caption ?? '',
        timestamp: post.timestamp,
        likes: post.likesCount ?? 0,
        comments: post.commentsCount ?? 0,
        media_type: post.type ?? 'Image',
        permalink: post.url ?? post.shortCode ? `https://www.instagram.com/p/${post.shortCode}/` : '',
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
            display_name: item.fullName ?? handle,
            bio: item.biography ?? '',
            followers: item.followersCount ?? item.followedBy ?? 0,
            following: item.followsCount ?? item.follows ?? 0,
            post_count: item.postsCount ?? 0,
            is_restricted: item.isRestrictedProfile ?? false,
            external_url: item.externalUrl ?? null,
          },
          recent_posts: recentPosts,
        },
      })

      competitorReports++

    } else if (item.id && item.postsCount !== undefined && item.name) {
      // This is a HASHTAG result
      const tag = item.name ?? item.id
      console.log(`[apify-webhook] Hashtag: #${tag}, posts: ${item.postsCount}`)

      // Extract related hashtags for research value
      const related = [
        ...(item.related ?? []),
        ...(item.relatedFrequent ?? []),
        ...(item.relatedAverage ?? []),
        ...(item.relatedRare ?? []),
      ].map((r: any) => ({
        tag: r.hash ?? r.name ?? '',
        count: r.info ?? '',
      }))

      await supabase.from('research_reports').insert({
        profile_id: report.profile_id,
        type: 'trend',
        title: `IG Trending: #${tag}`,
        body: {
          term: `#${tag}`,
          platform: 'instagram',
          scraped_at: new Date().toISOString(),
          post_count: item.postsCount ?? 0,
          posts_per_day: item.postsPerDay ?? null,
          search_source: item.searchSource ?? null,
          related_hashtags: related,
        },
      })

      hashtagReports++

    } else if (item.caption !== undefined && item.ownerUsername) {
      // This is a POST result (from posts scraping mode)
      // Group with owner if tracked, otherwise it's a hashtag post
      console.log(`[apify-webhook] Post by @${item.ownerUsername}: ${(item.caption ?? '').slice(0, 50)}`)
      // Posts are handled differently — they come when resultsType is 'posts'
      // For now, we don't get individual posts with 'details' mode

    } else {
      console.log(`[apify-webhook] Unknown item type:`, Object.keys(item).join(', '))
    }
  }

  // Update the pending report
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

  await createNotification(
    report.profile_id,
    'system',
    `IG research complete: ${competitorReports} profiles, ${hashtagReports} hashtags`
  )

  console.log(`[apify-webhook] Done: ${competitorReports} competitors, ${hashtagReports} hashtags`)

  return NextResponse.json({ ok: true })
}
