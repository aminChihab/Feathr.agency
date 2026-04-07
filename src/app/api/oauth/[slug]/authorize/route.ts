import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes, createHash } from 'crypto'

const OAUTH_CONFIGS: Record<string, { authUrl: string; tokenUrl: string; scopes: string[]; clientIdEnv: string }> = {
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'dm.read', 'dm.write', 'offline.access'],
    clientIdEnv: 'TWITTER_CLIENT_ID',
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const config = OAUTH_CONFIGS[slug]

  if (!config) {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  }

  const clientId = process.env[config.clientIdEnv]
  if (!clientId) {
    return NextResponse.json({ error: 'OAuth not configured for this platform' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // PKCE
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')

  // State
  const state = Buffer.from(JSON.stringify({ userId: user.id, slug })).toString('base64url')

  const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL ?? request.nextUrl.origin}/api/oauth/${slug}/callback`

  const authUrl = new URL(config.authUrl)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', config.scopes.join(' '))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  const response = NextResponse.redirect(authUrl.toString())
  response.cookies.set('oauth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
