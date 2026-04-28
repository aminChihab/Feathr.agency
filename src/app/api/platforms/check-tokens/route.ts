import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { INSTAGRAM_API_VERSION } from '@/lib/instagram'

// POST /api/platforms/check-tokens — Validate all connected platform tokens
// Returns list of expired platforms and auto-updates their status
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: accounts } = await service
    .from('platform_accounts')
    .select('id, platform_id, credentials_encrypted, status, platforms(slug, name)')
    .eq('profile_id', user.id)
    .in('status', ['connected', 'expired'])

  const expired: { id: string; name: string; slug: string }[] = []
  const valid: string[] = []

  for (const account of accounts ?? []) {
    const platform = (account as any).platforms
    if (!platform || !account.credentials_encrypted) continue

    let isValid = false

    try {
      const creds = decryptCredentials(account.credentials_encrypted)

      if (platform.slug === 'twitter' || platform.slug === 'x') {
        // Test Twitter token
        const token = creds.access_token
        if (token) {
          const res = await fetch('https://api.x.com/2/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            isValid = true
          } else if (res.status === 401 && creds.refresh_token) {
            // Try refresh
            const refreshRes = await fetch('https://api.twitter.com/2/oauth2/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
              },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: creds.refresh_token,
              }),
            })
            if (refreshRes.ok) {
              const { encryptCredentials } = await import('@/lib/crypto')
              const newTokenData = await refreshRes.json()
              await service
                .from('platform_accounts')
                .update({ credentials_encrypted: encryptCredentials(newTokenData), status: 'connected' })
                .eq('id', account.id)
              isValid = true
            }
          }
        }
      } else if (platform.slug === 'instagram') {
        // Test Instagram token
        const token = creds.access_token
        if (token) {
          const res = await fetch(`https://graph.instagram.com/${INSTAGRAM_API_VERSION}/me?access_token=${token}`)
          isValid = res.ok
        }
      }
      // Other platforms: skip validation, assume valid
      else {
        isValid = true
      }
    } catch {
      isValid = false
    }

    if (!isValid) {
      // Mark as expired in DB
      if (account.status !== 'expired') {
        await service.from('platform_accounts').update({ status: 'expired' }).eq('id', account.id)
      }
      expired.push({ id: account.id, name: platform.name, slug: platform.slug })
    } else {
      // Ensure status is connected
      if (account.status !== 'connected') {
        await service.from('platform_accounts').update({ status: 'connected' }).eq('id', account.id)
      }
      valid.push(account.id)
    }
  }

  return NextResponse.json({ expired, valid_count: valid.length })
}
