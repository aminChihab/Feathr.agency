import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — Register webhook URL with Twitter and subscribe the user
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the user's Twitter account
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('id, credentials_encrypted, platforms!inner(slug)')
    .eq('profile_id', user.id)
    .eq('status', 'connected')

  const twitterAccount = (accounts ?? []).find((a: any) => a.platforms?.slug === 'twitter')

  if (!twitterAccount) {
    return NextResponse.json({ error: 'No Twitter account connected' }, { status: 400 })
  }

  const creds = JSON.parse(twitterAccount.credentials_encrypted ?? '{}')
  const accessToken = creds.access_token

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 400 })
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://feathr-agency.vercel.app'}/api/webhook/twitter`

  console.log('[webhook-register] Registering webhook:', webhookUrl)

  const errors: string[] = []

  // Step 1: Register the webhook URL
  try {
    const registerResponse = await fetch(
      `https://api.x.com/2/webhooks?url=${encodeURIComponent(webhookUrl)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    const registerData = await registerResponse.json()
    console.log('[webhook-register] Register response:', registerResponse.status, JSON.stringify(registerData))

    if (!registerResponse.ok) {
      // Check if webhook already exists
      if (registerData.errors?.[0]?.message?.includes('already')) {
        console.log('[webhook-register] Webhook already registered')
      } else {
        errors.push(`Register failed: ${JSON.stringify(registerData)}`)
      }
    }

    const webhookId = registerData.data?.id ?? registerData.id

    // Step 2: Subscribe the user to receive events
    if (webhookId) {
      console.log('[webhook-register] Subscribing user to webhook:', webhookId)

      const subscribeResponse = await fetch(
        `https://api.x.com/2/account_activity/webhooks/${webhookId}/subscriptions/all`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      console.log('[webhook-register] Subscribe response:', subscribeResponse.status)

      if (!subscribeResponse.ok) {
        const subData = await subscribeResponse.text()
        errors.push(`Subscribe failed: ${subData}`)
      }
    }
  } catch (error) {
    console.error('[webhook-register] Error:', error)
    errors.push(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  const result = {
    webhook_url: webhookUrl,
    errors: errors.length > 0 ? errors : undefined,
    status: errors.length === 0 ? 'registered' : 'partial',
  }

  console.log('[webhook-register] Done:', JSON.stringify(result))
  return NextResponse.json(result)
}
