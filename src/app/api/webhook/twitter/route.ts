import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { decryptCredentials } from '@/lib/crypto'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — CRC Challenge Response
export async function GET(request: NextRequest) {
  const crcToken = request.nextUrl.searchParams.get('crc_token')

  if (!crcToken) {
    return NextResponse.json({ error: 'Missing crc_token' }, { status: 400 })
  }

  const consumerSecret = process.env.TWITTER_CONSUMER_SECRET
  if (!consumerSecret) {
    console.error('[webhook-twitter] Missing TWITTER_CONSUMER_SECRET')
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const hmac = createHmac('sha256', consumerSecret)
    .update(crcToken)
    .digest('base64')

  console.log('[webhook-twitter] CRC challenge responded')

  return NextResponse.json({ response_token: `sha256=${hmac}` })
}

// POST — Receive events from Twitter (XAA format)
// Webhook = instant notification with sender_id
// Then fetch that specific conversation's messages via API for plaintext
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-twitter-webhooks-signature')
  const consumerSecret = process.env.TWITTER_CONSUMER_SECRET

  if (signature && consumerSecret) {
    const expectedSig = 'sha256=' + createHmac('sha256', consumerSecret).update(rawBody).digest('base64')
    if (signature !== expectedSig) {
      console.error('[webhook-twitter] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else if (!signature) {
    console.warn('[webhook-twitter] No signature header — allowing through (testing mode)')
  }

  const body = JSON.parse(rawBody)

  const eventData = body.data
  if (!eventData) {
    return NextResponse.json({ ok: true })
  }

  const eventType = eventData.event_type
  const payload = eventData.payload

  // Only handle inbound DM/chat events
  if (eventType !== 'dm.received' && eventType !== 'chat.received') {
    return NextResponse.json({ ok: true })
  }

  const senderId = payload?.sender_id?.toString()
  if (!senderId) {
    console.log('[webhook-twitter] No sender_id in payload')
    return NextResponse.json({ ok: true })
  }

  console.log(`[webhook-twitter] Inbound message from ${senderId}`)

  const supabase = createServiceClient()

  // Find twitter platform + account
  const { data: twitterPlatform } = await supabase
    .from('platforms')
    .select('id')
    .eq('slug', 'twitter')
    .single()

  if (!twitterPlatform) {
    console.error('[webhook-twitter] Twitter platform not found')
    return NextResponse.json({ ok: true })
  }

  const { data: twitterAccounts } = await supabase
    .from('platform_accounts')
    .select('id, profile_id, credentials_encrypted')
    .eq('platform_id', twitterPlatform.id)
    .eq('status', 'connected')

  const account = twitterAccounts?.[0]
  if (!account) {
    console.log('[webhook-twitter] No connected Twitter account')
    return NextResponse.json({ ok: true })
  }

  const creds = decryptCredentials(account.credentials_encrypted ?? '{}')
  const accessToken = creds.access_token
  if (!accessToken) {
    console.log('[webhook-twitter] No access token')
    return NextResponse.json({ ok: true })
  }

  try {
    // Get our Twitter user ID
    const meRes = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!meRes.ok) {
      if (meRes.status === 401) {
        await supabase.from('platform_accounts').update({ status: 'expired' }).eq('id', account.id)
      }
      console.error('[webhook-twitter] /users/me failed:', meRes.status)
      return NextResponse.json({ ok: true })
    }

    const meData = await meRes.json()
    const myTwitterId = meData.data?.id
    if (!myTwitterId) return NextResponse.json({ ok: true })

    // Fetch messages for this specific conversation
    console.log(`[webhook-twitter] Fetching DMs with participant ${senderId}`)

    const dmRes = await fetch(
      `https://api.x.com/2/dm_conversations/with/${senderId}/dm_events?dm_event.fields=id,text,created_at,sender_id&max_results=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    console.log(`[webhook-twitter] DM API response: ${dmRes.status}`)

    if (!dmRes.ok) {
      const errBody = await dmRes.text()
      console.error('[webhook-twitter] DM API error:', errBody)
      return NextResponse.json({ ok: true })
    }

    const dmData = await dmRes.json()
    const events = dmData.data ?? []
    console.log(`[webhook-twitter] Fetched ${events.length} message(s) in conversation`)

    if (events.length === 0) return NextResponse.json({ ok: true })

    // Build external thread ID (same format as our sync)
    const externalThreadId = [myTwitterId, senderId].sort().join('-')

    // Find or create conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('profile_id', account.profile_id)
      .eq('external_thread_id', externalThreadId)
      .single()

    let conversationId: string

    if (existingConv) {
      conversationId = existingConv.id
      console.log(`[webhook-twitter] Existing conversation: ${conversationId}`)
    } else {
      // Look up sender name
      let contactName: string | null = null
      let contactHandle: string | null = null

      try {
        const userRes = await fetch(
          `https://api.x.com/2/users/${senderId}?user.fields=name,username`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (userRes.ok) {
          const userData = await userRes.json()
          contactName = userData.data?.name ?? null
          contactHandle = userData.data?.username ? `@${userData.data.username}` : null
        }
      } catch {
        // Skip
      }

      console.log(`[webhook-twitter] New conversation with ${contactName} ${contactHandle}`)

      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          profile_id: account.profile_id,
          platform_account_id: account.id,
          external_thread_id: externalThreadId,
          contact_name: contactName,
          contact_handle: contactHandle,
          status: 'new',
          priority: 'cold',
          type: 'other',
        })
        .select('id')
        .single()

      if (!newConv) {
        console.error('[webhook-twitter] Failed to create conversation')
        return NextResponse.json({ ok: true })
      }

      conversationId = newConv.id
    }

    // Insert new messages (dedup by sent_at)
    let newCount = 0
    for (const event of events) {
      const sentAt = event.created_at
      const text = event.text ?? ''

      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('sent_at', sentAt)
        .single()

      if (existing) continue

      const direction = event.sender_id === myTwitterId ? 'outbound' : 'inbound'

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        direction,
        body: text,
        ai_generated: false,
        sent_to_platform: true,
        sent_at: sentAt,
      })

      newCount++
      console.log(`[webhook-twitter] Saved ${direction}: "${text.slice(0, 50)}"`)
    }

    // Update last_message_at
    const latest = events.sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    if (latest) {
      await supabase
        .from('conversations')
        .update({ last_message_at: latest.created_at })
        .eq('id', conversationId)
    }

    console.log(`[webhook-twitter] Done: ${newCount} new message(s)`)
  } catch (err) {
    console.error('[webhook-twitter] Error:', err)
  }

  return NextResponse.json({ ok: true })
}
