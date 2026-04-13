import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[ig-sync] Starting for user:', user.id)

  // Get Instagram account
  const { data: igAccount } = await supabase
    .from('platform_accounts')
    .select('id, credentials_encrypted, metadata, platforms!inner(slug)')
    .eq('profile_id', user.id)
    .eq('status', 'connected')
    .eq('platforms.slug', 'instagram')
    .single()

  if (!igAccount) {
    console.log('[ig-sync] No connected Instagram account')
    return NextResponse.json({ error: 'No connected Instagram account' }, { status: 400 })
  }

  const creds = decryptCredentials(igAccount.credentials_encrypted ?? '{}')
  const accessToken = creds.access_token
  const igUserId = (igAccount.metadata as any)?.instagram_user_id ?? creds.instagram_user_id

  console.log('[ig-sync] IG user ID:', igUserId ? 'found' : 'MISSING', '| Token:', accessToken ? 'found' : 'MISSING')

  if (!accessToken || !igUserId) {
    return NextResponse.json({ error: 'Missing Instagram credentials' }, { status: 400 })
  }

  // Load research settings
  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .single()

  const settings = (profile?.settings as any) ?? {}
  const competitorHandles: string[] = settings.instagram_handles ?? []

  console.log('[ig-sync] Competitor handles:', competitorHandles.join(', ') || 'none')

  if (competitorHandles.length === 0) {
    console.log('[ig-sync] No competitor handles configured')
    return NextResponse.json({ competitor_reports: 0, message: 'No competitor handles configured' })
  }

  let competitorReports = 0
  const errors: string[] = []

  for (const handle of competitorHandles) {
    try {
      console.log(`[ig-sync] Looking up @${handle}...`)

      const url = `https://graph.instagram.com/v22.0/${igUserId}?fields=business_discovery.fields(username,name,biography,followers_count,follows_count,media_count,media.limit(12){caption,timestamp,like_count,comments_count,media_type,permalink}).username(${handle})&access_token=${accessToken}`

      const searchRes = await fetch(url)

      if (!searchRes.ok) {
        const errBody = await searchRes.text()
        console.error(`[ig-sync] @${handle}: ${searchRes.status}`, errBody.slice(0, 200))
        errors.push(`@${handle}: ${searchRes.status} — ${errBody.slice(0, 100)}`)
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }

      const data = await searchRes.json()
      const discovery = data.business_discovery

      if (!discovery) {
        console.log(`[ig-sync] @${handle}: no business_discovery in response`)
        errors.push(`@${handle}: not a business/creator account`)
        continue
      }

      const recentMedia = (discovery.media?.data ?? []).map((m: any) => ({
        caption: m.caption ?? '',
        timestamp: m.timestamp,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        media_type: m.media_type,
        permalink: m.permalink,
      }))

      console.log(`[ig-sync] @${handle}: ${discovery.followers_count ?? 0} followers, ${recentMedia.length} posts`)

      const { error: insertError } = await supabase.from('research_reports').insert({
        profile_id: user.id,
        type: 'competitor',
        title: `IG Competitor: @${handle}`,
        body: {
          handle,
          platform: 'instagram',
          scraped_at: new Date().toISOString(),
          profile: {
            display_name: discovery.name ?? handle,
            bio: discovery.biography ?? '',
            followers: discovery.followers_count ?? 0,
            following: discovery.follows_count ?? 0,
            post_count: discovery.media_count ?? 0,
          },
          recent_posts: recentMedia,
        },
      })

      if (insertError) {
        console.error(`[ig-sync] @${handle}: DB insert failed:`, insertError.message)
        errors.push(`@${handle}: DB error — ${insertError.message}`)
      } else {
        competitorReports++
      }

      await new Promise((r) => setTimeout(r, 1000))
    } catch (err) {
      console.error(`[ig-sync] @${handle}: exception:`, err)
      errors.push(`@${handle}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  console.log(`[ig-sync] Done: ${competitorReports} reports, ${errors.length} errors`)

  return NextResponse.json({
    competitor_reports: competitorReports,
    errors: errors.length > 0 ? errors : undefined,
  })
}
