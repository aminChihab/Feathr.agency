import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient as createServerClient } from '@supabase/supabase-js'

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
export async function POST(request: NextRequest) {
  const body = await request.json()

  console.log('[webhook-twitter] Event received:', JSON.stringify(body).slice(0, 1000))

  const supabase = createServiceClient()

  // XAA format: { data: { event_type, payload, filter } }
  const eventData = body.data
  if (!eventData) {
    // Legacy Account Activity format — log and skip for now
    console.log('[webhook-twitter] Legacy format or unknown event, skipping')
    return NextResponse.json({ ok: true })
  }

  const eventType = eventData.event_type
  const payload = eventData.payload
  const filterUserId = eventData.filter?.user_id

  console.log(`[webhook-twitter] XAA event: ${eventType} for user ${filterUserId}`)

  // Only handle DM/chat events
  if (!['dm.received', 'dm.sent', 'chat.received', 'chat.sent'].includes(eventType)) {
    console.log(`[webhook-twitter] Ignoring event type: ${eventType}`)
    return NextResponse.json({ ok: true })
  }

  if (!payload) {
    console.log('[webhook-twitter] No payload in event')
    return NextResponse.json({ ok: true })
  }

  // Find the twitter platform and account
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
    .select('id, profile_id')
    .eq('platform_id', twitterPlatform.id)
    .eq('status', 'connected')

  const matchedAccount = twitterAccounts?.[0] ?? null
  if (!matchedAccount) {
    console.log('[webhook-twitter] No matching platform account')
    return NextResponse.json({ ok: true })
  }

  // Extract message data from XAA payload
  const senderId = payload.sender_id?.toString()
  const recipientId = payload.recipient_id?.toString()
  const text = payload.text ?? payload.message_text ?? ''
  const messageId = payload.id ?? eventData.event_uuid
  const createdAtMs = payload.created_at_msec ?? payload.created_at
  const createdAt = createdAtMs
    ? new Date(parseInt(createdAtMs.toString())).toISOString()
    : new Date().toISOString()

  // Determine direction from event type
  const isInbound = eventType === 'dm.received' || eventType === 'chat.received'
  const direction = isInbound ? 'inbound' : 'outbound'

  console.log(`[webhook-twitter] ${direction} message from ${senderId} to ${recipientId}: "${text.slice(0, 100)}"`)

  // If no text, we might need to fetch it (encrypted chats don't include text in webhook)
  if (!text) {
    console.log('[webhook-twitter] No message text in payload — encrypted chat? Skipping for now.')
    console.log('[webhook-twitter] Full payload:', JSON.stringify(payload))
    return NextResponse.json({ ok: true })
  }

  // Build external thread ID
  const participants = [senderId, recipientId].filter(Boolean).sort()
  const externalThreadId = participants.join('-')
  const otherUserId = isInbound ? senderId : recipientId

  // Find or create conversation
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('profile_id', matchedAccount.profile_id)
    .eq('external_thread_id', externalThreadId)
    .single()

  let conversationId: string

  if (existingConv) {
    conversationId = existingConv.id
    console.log('[webhook-twitter] Existing conversation:', conversationId)
  } else {
    // Try to look up the other user's name via Twitter API
    let contactName: string | null = null
    let contactHandle: string | null = null

    // Get the user's access token to look up the sender
    if (otherUserId) {
      const { data: accountWithCreds } = await supabase
        .from('platform_accounts')
        .select('credentials_encrypted')
        .eq('id', matchedAccount.id)
        .single()

      if (accountWithCreds) {
        const creds = JSON.parse(accountWithCreds.credentials_encrypted ?? '{}')
        const accessToken = creds.access_token

        if (accessToken) {
          try {
            const userRes = await fetch(
              `https://api.x.com/2/users/${otherUserId}?user.fields=name,username`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            )
            if (userRes.ok) {
              const userData = await userRes.json()
              contactName = userData.data?.name ?? null
              contactHandle = userData.data?.username ? `@${userData.data.username}` : null
              console.log(`[webhook-twitter] Contact: ${contactName} ${contactHandle}`)
            }
          } catch {
            console.log('[webhook-twitter] User lookup failed')
          }
        }
      }
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        profile_id: matchedAccount.profile_id,
        platform_account_id: matchedAccount.id,
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
    console.log('[webhook-twitter] Created conversation:', conversationId)
  }

  // Dedup by message ID or timestamp
  const { data: existingMsg } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('sent_at', createdAt)
    .single()

  if (existingMsg) {
    console.log('[webhook-twitter] Message already exists, skipping')
    return NextResponse.json({ ok: true })
  }

  // Insert message
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    direction,
    body: text,
    ai_generated: false,
    sent_to_platform: true,
    sent_at: createdAt,
  })

  // Update conversation
  await supabase
    .from('conversations')
    .update({ last_message_at: createdAt })
    .eq('id', conversationId)

  console.log(`[webhook-twitter] Saved ${direction} message in conversation ${conversationId}`)

  return NextResponse.json({ ok: true })
}
