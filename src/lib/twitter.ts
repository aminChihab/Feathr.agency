import { createClient } from '@supabase/supabase-js'
import { encryptCredentials, decryptCredentials } from './crypto'

export async function getValidTwitterToken(
  credentials_encrypted: string,
  accountId: string
): Promise<string | null> {
  const creds = decryptCredentials(credentials_encrypted)
  const accessToken = creds.access_token
  const refreshToken = creds.refresh_token

  if (!accessToken) return null

  // Test if token works
  const testRes = await fetch('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (testRes.ok) return accessToken

  // Token expired — try refresh
  if (testRes.status === 401 && refreshToken) {
    console.log('[twitter] Token expired, refreshing...')

    const clientId = process.env.TWITTER_CLIENT_ID!
    const clientSecret = process.env.TWITTER_CLIENT_SECRET!

    const refreshRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (refreshRes.ok) {
      const newTokenData = await refreshRes.json()
      console.log('[twitter] Token refreshed successfully')

      // Update stored credentials
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      await supabase
        .from('platform_accounts')
        .update({ credentials_encrypted: encryptCredentials(newTokenData) })
        .eq('id', accountId)

      return newTokenData.access_token
    }

    console.error('[twitter] Token refresh failed:', refreshRes.status)
  }

  return null
}
