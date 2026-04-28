import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'
import { searchTweets, lookupProfile } from '@/lib/twitter'
import { DEFAULT_RESEARCH_TERMS, DEFAULT_COMPETITOR_HANDLES } from '@/lib/research-defaults'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[research] Starting research sync for user:', user.id)

  // Get Twitter access token
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('credentials_encrypted, platforms!inner(slug)')
    .eq('profile_id', user.id)
    .eq('status', 'connected')

  const twitterAccount = (accounts ?? []).find((a: any) => a.platforms?.slug === 'twitter')

  if (!twitterAccount) {
    return NextResponse.json({ error: 'No Twitter account connected' }, { status: 400 })
  }

  const creds = decryptCredentials(twitterAccount.credentials_encrypted ?? '{}')
  const accessToken = creds.access_token

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 400 })
  }

  // Load research config
  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .single()

  const settings = (profile?.settings as any) ?? {}

  const researchTerms: string[] = settings.twitter_terms ?? settings.research_terms ?? DEFAULT_RESEARCH_TERMS
  const competitorHandles: string[] = settings.twitter_handles ?? settings.competitor_handles ?? DEFAULT_COMPETITOR_HANDLES

  console.log(`[research] Terms: ${researchTerms.join(', ')}`)
  console.log(`[research] Competitors: ${competitorHandles.join(', ')}`)

  let trendReports = 0
  let competitorReports = 0
  const errors: string[] = []

  // Search trending
  for (const term of researchTerms) {
    try {
      const tweets = await searchTweets(accessToken, term)
      if (tweets.length > 0) {
        const { data: scraped } = await supabase.from('research_scraped').insert({
          profile_id: user.id,
          platform: 'twitter',
          data_type: 'hashtag',
          term,
          scraped_at: new Date().toISOString(),
        }).select('id').single()

        if (scraped) {
          await supabase.from('research_scraped_posts').insert(
            tweets.map((tweet: any) => ({
              scraped_id: scraped.id,
              caption: tweet.text,
              permalink: tweet.tweetUrl,
              likes: tweet.likes ?? 0,
              comments: tweet.replies ?? 0,
              views: tweet.views ?? 0,
              posted_at: tweet.postedAt ?? null,
            }))
          )
        }

        trendReports++
        console.log(`[research] Saved trend: "${term}" (${tweets.length} tweets)`)
      }
    } catch (err) {
      errors.push(`Search "${term}": ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  // Lookup competitors
  for (const handle of competitorHandles) {
    try {
      const profileData = await lookupProfile(accessToken, handle)
      if (profileData) {
        const { data: scraped } = await supabase.from('research_scraped').insert({
          profile_id: user.id,
          platform: 'twitter',
          data_type: 'competitor',
          handle: profileData.handle,
          display_name: profileData.displayName,
          bio: profileData.bio,
          followers: profileData.followers,
          following: profileData.following,
          post_count: profileData.tweetCount,
          scraped_at: new Date().toISOString(),
        }).select('id').single()

        if (scraped && profileData.recentTweets.length > 0) {
          await supabase.from('research_scraped_posts').insert(
            profileData.recentTweets.map((tweet: any) => ({
              scraped_id: scraped.id,
              caption: tweet.text,
              permalink: tweet.tweetUrl,
              likes: tweet.likes ?? 0,
              comments: tweet.replies ?? 0,
              views: tweet.views ?? 0,
              posted_at: tweet.postedAt ?? null,
            }))
          )
        }

        competitorReports++
        console.log(`[research] Saved competitor: @${profileData.handle}`)
      }
    } catch (err) {
      errors.push(`Profile @${handle}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  const result = {
    trend_reports: trendReports,
    competitor_reports: competitorReports,
    errors: errors.length > 0 ? errors : undefined,
  }

  console.log('[research] Done:', JSON.stringify(result))
  return NextResponse.json(result)
}
