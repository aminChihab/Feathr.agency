import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'

interface ScrapedTweet {
  text: string
  authorId: string
  authorHandle: string
  authorName: string
  likes: number
  retweets: number
  replies: number
  views: number
  tweetUrl: string
  postedAt: string
}

interface ProfileData {
  handle: string
  displayName: string
  bio: string
  followers: number
  following: number
  tweetCount: number
  recentTweets: {
    text: string
    likes: number
    retweets: number
    replies: number
    views: number
    tweetUrl: string
    postedAt: string
  }[]
}

async function searchTweets(accessToken: string, term: string): Promise<ScrapedTweet[]> {
  const params = new URLSearchParams({
    query: `${term} -is:retweet`,
    max_results: '20',
    'tweet.fields': 'created_at,public_metrics,author_id',
    expansions: 'author_id',
    'user.fields': 'name,username',
  })

  const response = await fetch(
    `https://api.x.com/2/tweets/search/recent?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  console.log(`[research] Search "${term}": ${response.status}`)

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`[research] Search error:`, errorBody)
    return []
  }

  const data = await response.json()
  const tweetData = data.data ?? []
  const users = data.includes?.users ?? []

  const userMap: Record<string, { name: string; username: string }> = {}
  for (const user of users) {
    userMap[user.id] = { name: user.name, username: user.username }
  }

  return tweetData.map((tweet: any) => {
    const user = userMap[tweet.author_id] ?? { name: '', username: '' }
    const metrics = tweet.public_metrics ?? {}
    return {
      text: tweet.text ?? '',
      authorId: tweet.author_id,
      authorHandle: `@${user.username}`,
      authorName: user.name,
      likes: metrics.like_count ?? 0,
      retweets: metrics.retweet_count ?? 0,
      replies: metrics.reply_count ?? 0,
      views: metrics.impression_count ?? 0,
      tweetUrl: `https://x.com/${user.username}/status/${tweet.id}`,
      postedAt: tweet.created_at ?? '',
    }
  })
}

async function lookupProfile(accessToken: string, handle: string): Promise<ProfileData | null> {
  const cleanHandle = handle.replace(/^@/, '')

  // Get user profile
  const userResponse = await fetch(
    `https://api.x.com/2/users/by/username/${cleanHandle}?user.fields=description,public_metrics`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  console.log(`[research] Profile @${cleanHandle}: ${userResponse.status}`)

  if (!userResponse.ok) {
    console.error(`[research] Profile error:`, await userResponse.text())
    return null
  }

  const userData = await userResponse.json()
  const user = userData.data
  if (!user) return null

  const metrics = user.public_metrics ?? {}
  const profile: ProfileData = {
    handle: cleanHandle,
    displayName: user.name ?? '',
    bio: user.description ?? '',
    followers: metrics.followers_count ?? 0,
    following: metrics.following_count ?? 0,
    tweetCount: metrics.tweet_count ?? 0,
    recentTweets: [],
  }

  // Get recent tweets
  const tweetsResponse = await fetch(
    `https://api.x.com/2/users/${user.id}/tweets?max_results=10&tweet.fields=created_at,public_metrics&exclude=retweets,replies`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (tweetsResponse.ok) {
    const tweetsData = await tweetsResponse.json()
    for (const tweet of tweetsData.data ?? []) {
      const tm = tweet.public_metrics ?? {}
      profile.recentTweets.push({
        text: tweet.text ?? '',
        likes: tm.like_count ?? 0,
        retweets: tm.retweet_count ?? 0,
        replies: tm.reply_count ?? 0,
        views: tm.impression_count ?? 0,
        tweetUrl: `https://x.com/${cleanHandle}/status/${tweet.id}`,
        postedAt: tweet.created_at ?? '',
      })
    }
  }

  console.log(`[research] @${cleanHandle}: ${profile.followers} followers, ${profile.recentTweets.length} tweets`)
  return profile
}

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
  const DEFAULT_TERMS = [
    '"taking bookings" Amsterdam',
    '"hosting incall" Netherlands',
    'GFE available',
    '"dinner date" companion',
    '"outcall hotel"',
    'OnlyFans companion Amsterdam',
    'touring Europe availability',
    '"high class" companion Netherlands',
    '#GFE #companion',
    '"accepting bookings"',
  ]

  const DEFAULT_HANDLES = [
    'QualityEscort',
    'escortamster',
    '247escortgirl',
    'DutchEscort',
    'msveradijkmans',
    'luxydutch',
    'EllieLeen1',
    'OFxxxKaylee',
    'AlinaAbramsX',
  ]

  const researchTerms: string[] = settings.twitter_terms ?? settings.research_terms ?? DEFAULT_TERMS
  const competitorHandles: string[] = settings.twitter_handles ?? settings.competitor_handles ?? DEFAULT_HANDLES

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
