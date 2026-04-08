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
// Twitter sends a crc_token, we respond with HMAC-SHA256 hash using our consumer secret
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

// POST — Receive DM events from Twitter
export async function POST(request: NextRequest) {
  const body = await request.json()

  console.log('[webhook-twitter] Event received:', JSON.stringify(body).slice(0, 500))

  // Twitter sends different event types — we only care about direct_message_events
  const dmEvents = body.direct_message_events
  if (!dmEvents || dmEvents.length === 0) {
    // Could be other event types (tweet, follow, etc.) — ignore for now
    return NextResponse.json({ ok: true })
  }

  const forUserId = body.for_user_id
  if (!forUserId) {
    console.log('[webhook-twitter] No for_user_id in payload')
    return NextResponse.json({ ok: true })
  }

  console.log(`[webhook-twitter] ${dmEvents.length} DM event(s) for Twitter user ${forUserId}`)

  const supabase = createServiceClient()

  // Find the platform account that matches this Twitter user ID
  // First get the twitter platform id
  const { data: twitterPlatform, error: platformError } = await supabase
    .from('platforms')
    .select('id')
    .eq('slug', 'twitter')
    .single()

  console.log('[webhook-twitter] Twitter platform:', twitterPlatform?.id, 'error:', platformError?.message)

  if (!twitterPlatform) {
    console.error('[webhook-twitter] Twitter platform not found in platforms table')
    return NextResponse.json({ ok: true })
  }

  // Find connected twitter accounts
  const { data: twitterAccounts, error: accountError } = await supabase
    .from('platform_accounts')
    .select('id, profile_id')
    .eq('platform_id', twitterPlatform.id)
    .eq('status', 'connected')

  console.log('[webhook-twitter] Found', (twitterAccounts ?? []).length, 'twitter account(s), error:', accountError?.message)

  // For now use the first one — later match by for_user_id stored in metadata
  const matchedAccount = twitterAccounts?.[0] ?? null

  if (!matchedAccount) {
    console.log('[webhook-twitter] No matching platform account found for user', forUserId)
    return NextResponse.json({ ok: true })
  }

  const users = body.users ?? {}

  for (const event of dmEvents) {
    // Only handle message_create events
    if (event.type !== 'message_create') continue

    const messageData = event.message_create
    const senderId = messageData.sender_id
    const recipientId = messageData.target?.recipient_id
    const text = messageData.message_data?.text ?? ''
    const createdAt = new Date(parseInt(event.created_timestamp)).toISOString()

    // Determine direction
    const isInbound = senderId !== forUserId
    const direction = isInbound ? 'inbound' : 'outbound'

    // Build conversation external ID (same format as our sync uses)
    const participantIds = [senderId, recipientId].sort()
    const externalThreadId = participantIds.join('-')
    const otherUserId = isInbound ? senderId : recipientId

    console.log(`[webhook-twitter] DM: ${direction} from ${senderId} to ${recipientId}`)

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
    } else {
      // Get contact info from users object in the payload
      const otherUser = users[otherUserId]
      const contactName = otherUser?.name ?? null
      const contactHandle = otherUser?.screen_name ? `@${otherUser.screen_name}` : null

      console.log(`[webhook-twitter] New conversation with ${contactName} ${contactHandle}`)

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
        continue
      }

      conversationId = newConv.id
    }

    // Check if message already exists (dedup by timestamp)
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('sent_at', createdAt)
      .single()

    if (existingMsg) {
      console.log('[webhook-twitter] Message already exists, skipping')
      continue
    }

    // Insert message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      direction,
      body: text,
      ai_generated: false,
      sent_to_platform: true, // came from the platform, already there
      sent_at: createdAt,
    })

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: createdAt })
      .eq('id', conversationId)

    console.log(`[webhook-twitter] Saved ${direction} message in conversation ${conversationId}`)
  }

  return NextResponse.json({ ok: true })
}
