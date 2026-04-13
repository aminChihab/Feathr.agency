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

  // Get metadata from query params
  const profileId = request.nextUrl.searchParams.get('profile_id')
  const actor = request.nextUrl.searchParams.get('actor') ?? 'unknown'
  const handlesParam = request.nextUrl.searchParams.get('handles')
  const termsParam = request.nextUrl.searchParams.get('terms')

  const handles: string[] = handlesParam ? JSON.parse(decodeURIComponent(handlesParam)) : []
  const terms: string[] = termsParam ? JSON.parse(decodeURIComponent(termsParam)) : []

  console.log(`[apify-webhook] Event: ${eventType}, Run: ${runId}, Actor: ${actor}, Profile: ${profileId}`)

  if (!runId || eventType !== 'ACTOR.RUN.SUCCEEDED' || !profileId) {
    console.log('[apify-webhook] Ignoring — missing data or non-success')
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // Get dataset from run
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

  let saved = 0

  if (actor === 'profile' && handles.length > 0) {
    // crawlerbros profile scraper — posts with authorMeta
    const handle = handles[0]
    const firstPost = allResults[0] ?? {}
    const authorMeta = firstPost.authorMeta ?? {}

    const { data: scraped } = await supabase.from('research_scraped').insert({
      profile_id: profileId,
      platform: 'instagram',
      data_type: 'competitor',
      handle,
      display_name: authorMeta.fullName ?? authorMeta.full_name ?? handle,
      bio: authorMeta.biography ?? authorMeta.bio ?? null,
      followers: authorMeta.followersCount ?? authorMeta.followers ?? 0,
      following: authorMeta.followsCount ?? authorMeta.following ?? 0,
      post_count: authorMeta.postsCount ?? authorMeta.media_count ?? 0,
      profile_pic_url: authorMeta.profilePicUrl ?? null,
      external_url: authorMeta.externalUrl ?? null,
    }).select('id').single()

    if (scraped && allResults.length > 0) {
      await supabase.from('research_scraped_posts').insert(
        allResults.map((post: any) => ({
          scraped_id: scraped.id,
          caption: post.description ?? post.caption ?? null,
          permalink: post.post_url ?? post.url ?? null,
          media_type: post.post_type ?? post.type ?? null,
          likes: post.like_count ?? post.likesCount ?? 0,
          comments: post.comment_count ?? post.commentsCount ?? 0,
          views: post.view_count ?? 0,
          media_urls: post.media_urls ?? [],
          hashtags: post.hashtags ?? [],
          posted_at: post.pub_date ?? post.timestamp ?? null,
        }))
      )
      saved = allResults.length
    }

    console.log(`[apify-webhook] @${handle}: saved ${saved} posts`)
    await createNotification(profileId, 'system', `IG: @${handle} scraped (${saved} posts)`)

  } else if (actor === 'hashtag') {
    // apify/instagram-scraper hashtag results
    for (const item of allResults) {
      if (item.name && item.postsCount !== undefined) {
        const tag = item.name ?? item.id

        const related = [
          ...(item.related ?? []),
          ...(item.relatedFrequent ?? []),
          ...(item.relatedAverage ?? []),
          ...(item.relatedRare ?? []),
        ]

        const { data: scraped } = await supabase.from('research_scraped').insert({
          profile_id: profileId,
          platform: 'instagram',
          data_type: 'hashtag',
          term: `#${tag}`,
          display_name: `#${tag}`,
          post_count: item.postsCount ?? 0,
        }).select('id').single()

        // Store related hashtags as "posts" (repurposing the table)
        // Actually better: just store in bio field as a summary
        if (scraped && related.length > 0) {
          await supabase.from('research_scraped').update({
            bio: related.map((r: any) => `${r.hash ?? ''}: ${r.info ?? ''}`).join(', '),
          }).eq('id', scraped.id)
        }

        saved++
        console.log(`[apify-webhook] #${tag}: ${item.postsCount} total posts, ${related.length} related`)
      } else if (item.error) {
        console.log(`[apify-webhook] Error: ${item.error} — ${item.inputUrl ?? ''}`)
      }
    }

    if (saved > 0) {
      await createNotification(profileId, 'system', `IG: ${saved} hashtag${saved !== 1 ? 's' : ''} analyzed`)
    }
  }

  console.log(`[apify-webhook] Done: ${saved} items saved`)
  return NextResponse.json({ ok: true, saved })
}
