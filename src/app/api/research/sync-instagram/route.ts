import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const APIFY_HASHTAG_ACTOR = 'apify~instagram-scraper'
const APIFY_PROFILE_ACTOR = 'crawlerbros~instagram-profile-scraper'

// Instagram cookies for authenticated scraping (restricted/21+ profiles)
const IG_COOKIES = process.env.INSTAGRAM_SCRAPER_COOKIES ?? ''

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

  console.log('[ig-sync] Handles:', competitorHandles.join(', ') || 'none')
  console.log('[ig-sync] Terms:', searchTerms.join(', ') || 'none')

  if (competitorHandles.length === 0 && searchTerms.length === 0) {
    return NextResponse.json({ started: false, message: 'No Instagram targets configured' })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://feathr-agency.vercel.app'

  let runsStarted = 0
  const errors: string[] = []

  // Run 1: Profile scraper with cookies (handles restricted/21+ content)
  // crawlerbros actor limitation: one run per handle
  if (competitorHandles.length > 0) {
    for (const handle of competitorHandles) {
      try {
        console.log(`[ig-sync] Starting profile scrape for @${handle}...`)

        // Pass metadata via webhook URL so the webhook can create records directly
        const webhookUrl = `${baseUrl}/api/webhook/apify?profile_id=${user.id}&handles=${encodeURIComponent(JSON.stringify([handle]))}&terms=${encodeURIComponent(JSON.stringify([]))}&actor=profile`
        const webhooksParam = Buffer.from(JSON.stringify([
          { eventTypes: ['ACTOR.RUN.SUCCEEDED'], requestUrl: webhookUrl },
        ])).toString('base64')

        const res = await fetch(
          `https://api.apify.com/v2/acts/${APIFY_PROFILE_ACTOR}/runs?token=${APIFY_TOKEN}&webhooks=${webhooksParam}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: handle,
              maxPosts: 12,
              cookies: IG_COOKIES,
            }),
          }
        )

        if (!res.ok) {
          const err = await res.text()
          console.error(`[ig-sync] @${handle}: failed:`, res.status, err.slice(0, 200))
          errors.push(`@${handle}: ${res.status}`)
          continue
        }

        const runData = await res.json()
        const runId = runData.data?.id
        console.log(`[ig-sync] @${handle}: run started, id=${runId}`)

        runsStarted++
      } catch (err) {
        console.error(`[ig-sync] @${handle}: exception:`, err)
        errors.push(`@${handle}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }

  // Run 2: Hashtag scraper (one run for all hashtags)
  if (searchTerms.length > 0) {
    try {
      const cleanTerms = searchTerms.map((t) => t.replace(/^#/, '').toLowerCase())
      const hashtagUrls = cleanTerms.map((t) =>
        `https://www.instagram.com/explore/tags/${t}/`
      )
      console.log('[ig-sync] Starting hashtag scrape:', hashtagUrls.join(', '))

      // Pass metadata via webhook URL so the webhook can create records directly
      const webhookUrl = `${baseUrl}/api/webhook/apify?profile_id=${user.id}&handles=${encodeURIComponent(JSON.stringify([]))}&terms=${encodeURIComponent(JSON.stringify(cleanTerms))}&actor=hashtag`
      const webhooksParam = Buffer.from(JSON.stringify([
        { eventTypes: ['ACTOR.RUN.SUCCEEDED'], requestUrl: webhookUrl },
      ])).toString('base64')

      const res = await fetch(
        `https://api.apify.com/v2/acts/${APIFY_HASHTAG_ACTOR}/runs?token=${APIFY_TOKEN}&webhooks=${webhooksParam}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directUrls: hashtagUrls,
            resultsLimit: 20,
          }),
        }
      )

      if (!res.ok) {
        const err = await res.text()
        console.error('[ig-sync] Hashtag scrape failed:', res.status, err.slice(0, 200))
        errors.push(`hashtags: ${res.status}`)
      } else {
        const runData = await res.json()
        const runId = runData.data?.id
        console.log(`[ig-sync] Hashtag run started, id=${runId}`)

        runsStarted++
      }
    } catch (err) {
      console.error('[ig-sync] Hashtag exception:', err)
      errors.push(`hashtags: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  console.log(`[ig-sync] Started ${runsStarted} runs, ${errors.length} errors`)

  return NextResponse.json({
    runs_started: runsStarted,
    errors: errors.length > 0 ? errors : undefined,
  })
}
