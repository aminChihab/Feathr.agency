import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get Instagram account
  const { data: igAccount } = await supabase
    .from('platform_accounts')
    .select('id, credentials_encrypted, metadata, platforms!inner(slug)')
    .eq('profile_id', user.id)
    .eq('status', 'connected')
    .eq('platforms.slug', 'instagram')
    .single()

  if (!igAccount) {
    return NextResponse.json({ error: 'No connected Instagram account' }, { status: 400 })
  }

  const creds = decryptCredentials(igAccount.credentials_encrypted ?? '{}')
  const accessToken = creds.access_token
  const igUserId = (igAccount.metadata as any)?.instagram_user_id ?? creds.instagram_user_id

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
  const competitorHandles: string[] = settings.competitor_handles ?? []

  let competitorReports = 0
  const errors: string[] = []

  for (const handle of competitorHandles) {
    try {
      const searchRes = await fetch(
        `https://graph.instagram.com/v22.0/${igUserId}?fields=business_discovery.fields(username,name,biography,followers_count,follows_count,media_count,media.limit(12){caption,timestamp,like_count,comments_count,media_type,permalink}).username(${handle})&access_token=${accessToken}`
      )

      if (!searchRes.ok) {
        console.log(`[ig-sync] Profile @${handle}: ${searchRes.status}`)
        errors.push(`@${handle}: ${searchRes.status}`)
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }

      const data = await searchRes.json()
      const discovery = data.business_discovery

      if (!discovery) {
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

      await supabase.from('research_reports').insert({
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

      competitorReports++
      await new Promise((r) => setTimeout(r, 1000))
    } catch (err) {
      errors.push(`@${handle}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({
    competitor_reports: competitorReports,
    errors: errors.length > 0 ? errors : undefined,
  })
}
