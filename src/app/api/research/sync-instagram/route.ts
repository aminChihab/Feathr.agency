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
    return NextResponse.json({ started: false, message: 'No Instagram targets configured' })
  }

  // Build all URLs in one batch
  const allUrls: string[] = [
    ...competitorHandles.map((h) => `https://www.instagram.com/${h}/`),
    ...searchTerms.map((t) => `https://www.instagram.com/explore/tags/${t.replace(/^#/, '').toLowerCase()}/`),
  ]

  console.log('[ig-sync] URLs:', allUrls.join(', '))

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://feathr-agency.vercel.app'}/api/webhook/apify`
  const webhooksParam = Buffer.from(JSON.stringify([
    { eventTypes: ['ACTOR.RUN.SUCCEEDED'], requestUrl: webhookUrl },
  ])).toString('base64')

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs?token=${APIFY_TOKEN}&webhooks=${webhooksParam}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: allUrls,
          resultsLimit: 20,
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('[ig-sync] Failed to start run:', res.status, err.slice(0, 300))
      return NextResponse.json({ error: `Apify error: ${res.status}`, detail: err.slice(0, 200) }, { status: 500 })
    }

    const runData = await res.json()
    const runId = runData.data?.id
    console.log(`[ig-sync] Run started, id=${runId}, ${allUrls.length} URLs`)

    // Store one pending report with all targets
    await supabase.from('research_reports').insert({
      profile_id: user.id,
      type: 'market',
      title: 'IG Research (pending)',
      body: {
        platform: 'instagram',
        apify_run_id: runId,
        status: 'pending',
        started_at: new Date().toISOString(),
        handles: competitorHandles,
        terms: searchTerms.map((t) => t.replace(/^#/, '').toLowerCase()),
      },
    })

    return NextResponse.json({ started: true, run_id: runId, urls: allUrls.length })
  } catch (err) {
    console.error('[ig-sync] Exception:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
