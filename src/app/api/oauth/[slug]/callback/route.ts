import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OAUTH_CONFIGS: Record<string, { tokenUrl: string; clientIdEnv: string; clientSecretEnv: string }> = {
  twitter: {
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const config = OAUTH_CONFIGS[slug]

  if (!config) {
    return NextResponse.redirect(new URL('/onboarding?error=unsupported', request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const codeVerifier = request.cookies.get('oauth_code_verifier')?.value

  if (!code || !state || !codeVerifier) {
    return NextResponse.redirect(new URL('/onboarding?error=missing_params', request.url))
  }

  // Decode state
  let stateData: { userId: string; slug: string }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    return NextResponse.redirect(new URL('/onboarding?error=invalid_state', request.url))
  }

  const clientId = process.env[config.clientIdEnv]!
  const clientSecret = process.env[config.clientSecretEnv]!
  const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? request.nextUrl.origin}/api/oauth/${slug}/callback`

  // Exchange code for token
  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/onboarding?error=token_exchange_failed', request.url))
  }

  const tokenData = await tokenResponse.json()

  // Get platform ID
  const supabase = await createClient()
  const { data: platform } = await supabase
    .from('platforms')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!platform) {
    return NextResponse.redirect(new URL('/onboarding?error=platform_not_found', request.url))
  }

  // Store the token
  await supabase.from('platform_accounts').upsert(
    {
      profile_id: stateData.userId,
      platform_id: platform.id,
      credentials_encrypted: JSON.stringify(tokenData),
      status: 'connected',
    },
    { onConflict: 'profile_id,platform_id' }
  )

  // Subscribe user to webhook for DM events
  if (slug === 'twitter' && process.env.TWITTER_WEBHOOK_ID) {
    const userToken = tokenData.access_token
    const webhookId = process.env.TWITTER_WEBHOOK_ID

    console.log('[oauth-callback] Subscribing user to webhook:', webhookId)

    try {
      const subRes = await fetch(
        `https://api.x.com/2/account_activity/webhooks/${webhookId}/subscriptions/all`,
        { method: 'POST', headers: { Authorization: `Bearer ${userToken}` } }
      )
      console.log('[oauth-callback] Webhook subscribe:', subRes.status)

      if (!subRes.ok) {
        const subBody = await subRes.text()
        console.log('[oauth-callback] Subscribe error:', subBody)
      }
    } catch (err) {
      console.error('[oauth-callback] Webhook subscription failed:', err)
    }
  }

  // Clear cookie and redirect back to the right page
  // Check if user is in onboarding or already active
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', stateData.userId)
    .single()

  const redirectPath = (profile?.status === 'active' || profile?.status === 'paused')
    ? '/platforms'
    : '/onboarding'

  const response = NextResponse.redirect(new URL(redirectPath, request.url))
  response.cookies.delete('oauth_code_verifier')
  return response
}
