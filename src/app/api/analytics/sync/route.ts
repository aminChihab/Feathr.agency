// src/app/api/analytics/sync/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[analytics-sync] Starting for user:', user.id)

  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('id, credentials_encrypted, platforms!inner(slug)')
    .eq('profile_id', user.id)
    .eq('status', 'connected')

  const twitterAccounts = (accounts ?? []).filter(
    (a: any) => a.platforms?.slug === 'twitter'
  )

  console.log('[analytics-sync] Found', twitterAccounts.length, 'Twitter account(s)')

  if (twitterAccounts.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No Twitter accounts connected' })
  }

  const results: any[] = []
  const errors: string[] = []
  const today = new Date().toISOString().split('T')[0]

  for (const account of twitterAccounts) {
    const creds = decryptCredentials(account.credentials_encrypted ?? '{}')
    const accessToken = creds.access_token

    if (!accessToken) {
      errors.push(`Account ${account.id}: no access_token`)
      continue
    }

    try {
      const response = await fetch(
        'https://api.twitter.com/2/users/me?user.fields=public_metrics',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      console.log('[analytics-sync] Twitter API response:', response.status)

      if (!response.ok) {
        if (response.status === 401) {
          await supabase.from('platform_accounts').update({ status: 'expired' }).eq('id', account.id)
          errors.push(`Account ${account.id}: token expired`)
        } else {
          const body = await response.text()
          errors.push(`Account ${account.id}: ${response.status} — ${body.slice(0, 200)}`)
        }
        continue
      }

      const data = await response.json()
      const metrics = data.data?.public_metrics

      console.log('[analytics-sync] Metrics:', JSON.stringify(metrics))

      if (metrics) {
        await supabase.from('analytics').upsert(
          {
            profile_id: user.id,
            platform_account_id: account.id,
            date: today,
            followers: metrics.followers_count ?? 0,
            impressions: 0,
            engagement: 0,
            revenue_cents: 0,
          },
          { onConflict: 'platform_account_id,date' }
        )

        results.push({
          account_id: account.id,
          followers: metrics.followers_count,
          tweets: metrics.tweet_count,
        })
      }
    } catch (error) {
      console.error('[analytics-sync] Error:', error)
      errors.push(`Account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const result = { synced: results.length, metrics: results, errors: errors.length > 0 ? errors : undefined }
  console.log('[analytics-sync] Done:', JSON.stringify(result))

  return NextResponse.json(result)
}
