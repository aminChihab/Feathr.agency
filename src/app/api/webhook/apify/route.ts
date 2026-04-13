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
  const actorType = reportBody.apify_actor ?? 'unknown'
  const handles: string[] = reportBody.handles ?? []
  const terms: string[] = reportBody.terms ?? []

  console.log(`[apify-webhook] Actor: ${actorType}, handles: ${handles.join(',')}, terms: ${terms.join(',')}`)

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
  console.log(`[apify-webhook] Got ${allResults.length} results, first item keys: ${allResults[0] ? Object.keys(allResults[0]).join(', ') : 'empty'}`)

  let competitorReports = 0
  let hashtagReports = 0

  if (actorType === 'profile') {
    // crawlerbros/instagram-profile-scraper output
    // Each result is a post with: description, post_url, pub_date, like_count, comment_count,
    // view_count, media_urls, post_type, username, scraped_at, authorMeta
    const handle = handles[0] ?? 'unknown'

    // Extract profile data from authorMeta of first post
    const firstPost = allResults[0] ?? {}
    const authorMeta = firstPost.authorMeta ?? {}

    const recentPosts = allResults.map((post: any) => ({
      caption: post.description ?? post.caption ?? post.text ?? '',
      timestamp: post.pub_date ?? post.timestamp ?? null,
      likes: post.like_count ?? post.likesCount ?? 0,
      comments: post.comment_count ?? post.commentsCount ?? 0,
      views: post.view_count ?? 0,
      media_type: post.post_type ?? post.type ?? 'Image',
      permalink: post.post_url ?? post.url ?? '',
      media_urls: post.media_urls ?? [],
      hashtags: post.hashtags ?? [],
    }))

    console.log(`[apify-webhook] @${handle}: ${recentPosts.length} posts, authorMeta keys: ${Object.keys(authorMeta).join(', ')}`)

    await supabase.from('research_reports').insert({
      profile_id: report.profile_id,
      type: 'competitor',
      title: `IG Competitor: @${handle}`,
      body: {
        handle,
        platform: 'instagram',
        scraped_at: new Date().toISOString(),
        profile: {
          display_name: authorMeta.fullName ?? authorMeta.full_name ?? authorMeta.name ?? handle,
          bio: authorMeta.biography ?? authorMeta.bio ?? '',
          followers: authorMeta.followersCount ?? authorMeta.follower_count ?? authorMeta.followers ?? 0,
          following: authorMeta.followsCount ?? authorMeta.following_count ?? authorMeta.following ?? 0,
          post_count: authorMeta.postsCount ?? authorMeta.media_count ?? 0,
          profile_pic: authorMeta.profilePicUrl ?? authorMeta.profile_pic_url ?? null,
          external_url: authorMeta.externalUrl ?? authorMeta.external_url ?? null,
        },
        recent_posts: recentPosts,
      },
    })

    competitorReports++
    await createNotification(report.profile_id, 'system', `IG: @${handle} scraped (${recentPosts.length} posts)`)

  } else if (actorType === 'hashtag') {
    // apify/instagram-scraper hashtag output
    for (const item of allResults) {
      if (item.name && item.postsCount !== undefined) {
        // Hashtag metadata
        const tag = item.name ?? item.id
        const related = [
          ...(item.related ?? []),
          ...(item.relatedFrequent ?? []),
          ...(item.relatedAverage ?? []),
          ...(item.relatedRare ?? []),
        ].map((r: any) => ({ tag: r.hash ?? '', count: r.info ?? '' }))

        await supabase.from('research_reports').insert({
          profile_id: report.profile_id,
          type: 'trend',
          title: `IG Trending: #${tag}`,
          body: {
            term: `#${tag}`,
            platform: 'instagram',
            scraped_at: new Date().toISOString(),
            post_count: item.postsCount ?? 0,
            related_hashtags: related,
          },
        })

        hashtagReports++
        console.log(`[apify-webhook] #${tag}: ${item.postsCount} total posts, ${related.length} related tags`)
      } else if (item.error) {
        console.log(`[apify-webhook] Error item: ${item.error} — ${item.inputUrl ?? ''}`)
      }
    }

    if (hashtagReports > 0) {
      await createNotification(report.profile_id, 'system', `IG: ${hashtagReports} hashtag${hashtagReports !== 1 ? 's' : ''} analyzed`)
    }

  } else {
    // Unknown actor type — log everything for debugging
    console.log(`[apify-webhook] Unknown actor type: ${actorType}`)
    for (const item of allResults.slice(0, 2)) {
      console.log(`[apify-webhook] Item keys: ${Object.keys(item).join(', ')}`)
    }
  }

  // Update pending report
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

  console.log(`[apify-webhook] Done: ${competitorReports} competitors, ${hashtagReports} hashtags`)

  return NextResponse.json({ ok: true })
}
