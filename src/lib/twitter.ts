import { createServiceClient } from '@/lib/supabase/service'
import { encryptCredentials, decryptCredentials } from './crypto'

// ─── Token Management ──────────────────────────────────────────────────────

export async function getValidTwitterToken(
  credentialsEncrypted: string,
  accountId: string,
): Promise<string | null> {
  const creds = decryptCredentials(credentialsEncrypted)
  const { access_token: accessToken, refresh_token: refreshToken } = creds

  if (!accessToken) return null

  const testRes = await fetch('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (testRes.ok) return accessToken

  if (testRes.status === 401 && refreshToken) {
    return refreshAccessToken(refreshToken, accountId)
  }

  return null
}

async function refreshAccessToken(
  refreshToken: string,
  accountId: string,
): Promise<string | null> {
  console.log('[twitter] Token expired, refreshing...')

  const clientId = process.env.TWITTER_CLIENT_ID!
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })

  if (!res.ok) {
    console.error('[twitter] Token refresh failed:', res.status)
    return null
  }

  const newTokenData = await res.json()
  console.log('[twitter] Token refreshed successfully')

  const supabase = createServiceClient()
  await supabase
    .from('platform_accounts')
    .update({ credentials_encrypted: encryptCredentials(newTokenData) })
    .eq('id', accountId)

  return newTokenData.access_token
}

// ─── Posting ───────────────────────────────────────────────────────────────

export type PostResult = { success: boolean; postUrl?: string; error?: string; expired?: boolean }

export async function uploadMedia(
  accessToken: string,
  supabase: any,
  storagePath: string,
): Promise<string | null> {
  const { data: fileData, error } = await supabase.storage.from('media').download(storagePath)

  if (error || !fileData) {
    console.error('[twitter] Failed to download media:', storagePath, error?.message)
    return null
  }

  const formData = new FormData()
  formData.append('media', fileData, storagePath.split('/').pop() ?? 'file')
  formData.append('media_category', 'tweet_image')

  const res = await fetch('https://api.x.com/2/media/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })

  if (!res.ok) {
    console.error('[twitter] Media upload failed:', res.status, await res.text())
    return null
  }

  const data = await res.json()
  const mediaId = data.data?.id ?? data.media_id_string
  console.log('[twitter] Media uploaded:', mediaId)
  return mediaId
}

export async function postTweet(
  accessToken: string,
  caption: string | null,
  mediaIds: string[],
  supabase: any,
): Promise<PostResult> {
  const twitterMediaIds: string[] = []

  if (mediaIds.length > 0) {
    const { data: mediaItems } = await supabase
      .from('content_library')
      .select('id, storage_path, mime_type')
      .in('id', mediaIds)

    for (const item of mediaItems ?? []) {
      const id = await uploadMedia(accessToken, supabase, item.storage_path)
      if (id) twitterMediaIds.push(id)
    }
  }

  const payload: any = {}
  if (caption) payload.text = caption
  if (twitterMediaIds.length > 0) payload.media = { media_ids: twitterMediaIds }

  const res = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (res.status === 201) {
    const tweetId = (await res.json()).data?.id
    return { success: true, postUrl: tweetId ? `https://x.com/i/status/${tweetId}` : undefined }
  }

  const errorBody = await res.text()
  return {
    success: false,
    error: `Twitter API ${res.status} — ${errorBody.slice(0, 200)}`,
    expired: res.status === 401,
  }
}

// ─── Research ──────────────────────────────────────────────────────────────

export interface ScrapedTweet {
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

export interface TwitterProfile {
  handle: string
  displayName: string
  bio: string
  followers: number
  following: number
  tweetCount: number
  recentTweets: {
    text: string; likes: number; retweets: number;
    replies: number; views: number; tweetUrl: string; postedAt: string
  }[]
}

export async function searchTweets(accessToken: string, term: string): Promise<ScrapedTweet[]> {
  const params = new URLSearchParams({
    query: `${term} -is:retweet`,
    max_results: '20',
    'tweet.fields': 'created_at,public_metrics,author_id',
    expansions: 'author_id',
    'user.fields': 'name,username',
  })

  const res = await fetch(
    `https://api.x.com/2/tweets/search/recent?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  console.log(`[twitter] Search "${term}": ${res.status}`)
  if (!res.ok) {
    console.error('[twitter] Search error:', await res.text())
    return []
  }

  const data = await res.json()
  const users = Object.fromEntries(
    (data.includes?.users ?? []).map((u: any) => [u.id, { name: u.name, username: u.username }]),
  )

  return (data.data ?? []).map((tweet: any) => {
    const user = users[tweet.author_id] ?? { name: '', username: '' }
    const m = tweet.public_metrics ?? {}
    return {
      text: tweet.text ?? '',
      authorId: tweet.author_id,
      authorHandle: `@${user.username}`,
      authorName: user.name,
      likes: m.like_count ?? 0,
      retweets: m.retweet_count ?? 0,
      replies: m.reply_count ?? 0,
      views: m.impression_count ?? 0,
      tweetUrl: `https://x.com/${user.username}/status/${tweet.id}`,
      postedAt: tweet.created_at ?? '',
    }
  })
}

export async function lookupProfile(accessToken: string, handle: string): Promise<TwitterProfile | null> {
  const cleanHandle = handle.replace(/^@/, '')

  const userRes = await fetch(
    `https://api.x.com/2/users/by/username/${cleanHandle}?user.fields=description,public_metrics`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  console.log(`[twitter] Profile @${cleanHandle}: ${userRes.status}`)
  if (!userRes.ok) {
    console.error('[twitter] Profile error:', await userRes.text())
    return null
  }

  const user = (await userRes.json()).data
  if (!user) return null

  const metrics = user.public_metrics ?? {}
  const profile: TwitterProfile = {
    handle: cleanHandle,
    displayName: user.name ?? '',
    bio: user.description ?? '',
    followers: metrics.followers_count ?? 0,
    following: metrics.following_count ?? 0,
    tweetCount: metrics.tweet_count ?? 0,
    recentTweets: [],
  }

  const tweetsRes = await fetch(
    `https://api.x.com/2/users/${user.id}/tweets?max_results=10&tweet.fields=created_at,public_metrics&exclude=retweets,replies`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (tweetsRes.ok) {
    for (const tweet of (await tweetsRes.json()).data ?? []) {
      const m = tweet.public_metrics ?? {}
      profile.recentTweets.push({
        text: tweet.text ?? '',
        likes: m.like_count ?? 0,
        retweets: m.retweet_count ?? 0,
        replies: m.reply_count ?? 0,
        views: m.impression_count ?? 0,
        tweetUrl: `https://x.com/${cleanHandle}/status/${tweet.id}`,
        postedAt: tweet.created_at ?? '',
      })
    }
  }

  console.log(`[twitter] @${cleanHandle}: ${profile.followers} followers, ${profile.recentTweets.length} tweets`)
  return profile
}
