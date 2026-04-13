import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const APIFY_ACTOR = 'apify~instagram-scraper'

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
    return NextResponse.json({ runs: 0, message: 'No Instagram targets configured' })
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://feathr-agency.vercel.app'}/api/webhook/apify`
  let runsStarted = 0
  const errors: string[] = []

  // Start async runs for competitor profiles
  for (const handle of competitorHandles) {
    try {
      console.log(`[ig-sync] Starting async scrape for @${handle}...`)

      const res = await fetch(
        `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs?token=${APIFY_TOKEN}&webhooks=${encodeURIComponent(JSON.stringify([{ eventTypes: ['ACTOR.RUN.SUCCEEDED'], requestUrl: webhookUrl }]))}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directUrls: [`https://www.instagram.com/${handle}/`],
            resultsType: 'posts',
            resultsLimit: 12,
          }),
        }
      )

      if (!res.ok) {
        const err = await res.text()
        console.error(`[ig-sync] @${handle}: failed to start run:`, res.status, err.slice(0, 200))
        errors.push(`@${handle}: ${res.status}`)
        continue
      }

      const runData = await res.json()
      const runId = runData.data?.id
      console.log(`[ig-sync] @${handle}: run started, id=${runId}`)

      // Store run metadata so webhook knows what this run was for
      await supabase.from('research_reports').insert({
        profile_id: user.id,
        type: 'competitor',
        title: `IG Scrape: @${handle} (pending)`,
        body: {
          handle,
          platform: 'instagram',
          apify_run_id: runId,
          status: 'pending',
          started_at: new Date().toISOString(),
        },
      })

      runsStarted++
    } catch (err) {
      console.error(`[ig-sync] @${handle}: exception:`, err)
      errors.push(`@${handle}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Start async runs for hashtags
  for (const term of searchTerms) {
    try {
      const cleanTag = term.replace(/^#/, '').toLowerCase()
      console.log(`[ig-sync] Starting async scrape for #${cleanTag}...`)

      const res = await fetch(
        `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs?token=${APIFY_TOKEN}&webhooks=${encodeURIComponent(JSON.stringify([{ eventTypes: ['ACTOR.RUN.SUCCEEDED'], requestUrl: webhookUrl }]))}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directUrls: [`https://www.instagram.com/explore/tags/${cleanTag}/`],
            resultsType: 'posts',
            resultsLimit: 20,
          }),
        }
      )

      if (!res.ok) {
        const err = await res.text()
        console.error(`[ig-sync] #${cleanTag}: failed to start run:`, res.status, err.slice(0, 200))
        errors.push(`#${cleanTag}: ${res.status}`)
        continue
      }

      const runData = await res.json()
      const runId = runData.data?.id
      console.log(`[ig-sync] #${cleanTag}: run started, id=${runId}`)

      await supabase.from('research_reports').insert({
        profile_id: user.id,
        type: 'trend',
        title: `IG Scrape: #${cleanTag} (pending)`,
        body: {
          term: `#${cleanTag}`,
          platform: 'instagram',
          apify_run_id: runId,
          status: 'pending',
          started_at: new Date().toISOString(),
        },
      })

      runsStarted++
    } catch (err) {
      console.error(`[ig-sync] ${term}: exception:`, err)
      errors.push(`${term}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  console.log(`[ig-sync] Started ${runsStarted} async runs, ${errors.length} errors`)

  return NextResponse.json({
    runs_started: runsStarted,
    errors: errors.length > 0 ? errors : undefined,
  })
}
