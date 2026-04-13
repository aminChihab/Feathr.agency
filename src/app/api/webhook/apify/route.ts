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
    // Results can be profile data + posts mixed, or just posts
    const handle = handles[0] ?? 'unknown'

    // Check if we got profile-level data or individual posts
    const profileItem = allResults.find((item: any) => item.profileData || item.biography || item.fullName)
    const posts = allResults.filter((item: any) => item.caption !== undefined || item.shortCode || item.mediaUrl)

    // Build profile info from whatever we have
    const profileData = profileItem ?? allResults[0] ?? {}

    const recentPosts = posts.map((post: any) => ({
      caption: post.caption ?? post.text ?? '',
      timestamp: post.timestamp ?? post.takenAt ?? post.date ?? null,
      likes: post.likesCount ?? post.likes ?? 0,
      comments: post.commentsCount ?? post.comments ?? 0,
      media_type: post.type ?? post.mediaType ?? 'Image',
      permalink: post.url ?? (post.shortCode ? `https://www.instagram.com/p/${post.shortCode}/` : ''),
      media_url: post.displayUrl ?? post.mediaUrl ?? post.imageUrl ?? null,
      hashtags: post.hashtags ?? [],
    }))

    console.log(`[apify-webhook] @${handle}: profile found=${!!profileItem}, posts=${recentPosts.length}`)
    console.log(`[apify-webhook] @${handle}: profile keys: ${Object.keys(profileData).slice(0, 15).join(', ')}`)
    if (posts[0]) console.log(`[apify-webhook] @${handle}: post keys: ${Object.keys(posts[0]).slice(0, 15).join(', ')}`)

    await supabase.from('research_reports').insert({
      profile_id: report.profile_id,
      type: 'competitor',
      title: `IG Competitor: @${handle}`,
      body: {
        handle,
        platform: 'instagram',
        scraped_at: new Date().toISOString(),
        profile: {
          display_name: profileData.fullName ?? profileData.full_name ?? handle,
          bio: profileData.biography ?? profileData.bio ?? '',
          followers: profileData.followersCount ?? profileData.follower_count ?? profileData.followedBy ?? 0,
          following: profileData.followsCount ?? profileData.following_count ?? profileData.follows ?? 0,
          post_count: profileData.postsCount ?? profileData.media_count ?? 0,
          profile_pic: profileData.profilePicUrl ?? profileData.profile_pic_url ?? null,
          external_url: profileData.externalUrl ?? profileData.external_url ?? null,
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
