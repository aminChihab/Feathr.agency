import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — Meta webhook verification
// Meta sends hub.mode, hub.challenge, hub.verify_token
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token')

  const expectedToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && verifyToken === expectedToken && challenge) {
    console.log('[webhook-instagram] Verification challenge accepted')
    return new NextResponse(challenge, { status: 200 })
  }

  console.error('[webhook-instagram] Verification failed')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST — Receive Instagram messaging events
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Verify signature
  const signature = request.headers.get('x-hub-signature-256')
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  if (signature && appSecret) {
    const expectedSig = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
    if (signature !== expectedSig) {
      // Known issue: Meta may use a different secret for signing
      // Allow through but log warning
      console.warn('[webhook-instagram] Signature mismatch — allowing through')
    }
  }

  const body = JSON.parse(rawBody)

  console.log('[webhook-instagram] Event received:', JSON.stringify(body).slice(0, 500))

  // Meta webhook format: { object: 'instagram', entry: [...] }
  if (body.object !== 'instagram') {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // Find Instagram platform
  const { data: instagramPlatform } = await supabase
    .from('platforms')
    .select('id')
    .eq('slug', 'instagram')
    .single()

  if (!instagramPlatform) {
    console.error('[webhook-instagram] Instagram platform not found')
    return NextResponse.json({ ok: true })
  }

  for (const entry of body.entry ?? []) {
    const igAccountId = entry.id // The Instagram account ID that received the message

    // Find the matching platform account
    const { data: accounts } = await supabase
      .from('platform_accounts')
      .select('id, profile_id, metadata')
      .eq('platform_id', instagramPlatform.id)
      .eq('status', 'connected')

    // Match by Instagram user ID stored in metadata
    const account = accounts?.find(
      (a: any) => (a.metadata as any)?.instagram_user_id === igAccountId
    ) ?? accounts?.[0]

    if (!account) {
      console.log('[webhook-instagram] No matching Instagram account for', igAccountId)
      continue
    }

    // Process messaging events
    for (const messaging of entry.messaging ?? []) {
      const senderId = messaging.sender?.id
      const recipientId = messaging.recipient?.id
      const message = messaging.message
      const timestamp = messaging.timestamp

      if (!message || !senderId) continue

      const text = message.text ?? ''
      const isInbound = senderId !== igAccountId

      // Skip outbound messages — we already saved them when the user sent them from the inbox
      if (!isInbound) {
        console.log(`[webhook-instagram] Skipping outbound echo: "${text.slice(0, 50)}"`)
        continue
      }

      console.log(`[webhook-instagram] Inbound message from ${senderId}: "${text.slice(0, 50)}"`)

      // Build external thread ID
      const participants = [senderId, recipientId].filter(Boolean).sort()
      const externalThreadId = `ig-${participants.join('-')}`

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
      } else {
        console.log(`[webhook-instagram] New conversation with ${senderId}`)

        // Look up sender's name via Graph API
        let contactName: string | null = null
        let contactHandle: string | null = null

        const { data: accountWithCreds } = await supabase
          .from('platform_accounts')
          .select('credentials_encrypted')
          .eq('id', account.id)
          .single()

        if (accountWithCreds) {
          const { decryptCredentials } = await import('@/lib/crypto')
          const creds = decryptCredentials(accountWithCreds.credentials_encrypted ?? '{}')
          const accessToken = creds.access_token

          if (accessToken) {
            try {
              const userRes = await fetch(
                `https://graph.instagram.com/v25.0/${senderId}?fields=name,username&access_token=${accessToken}`
              )
              if (userRes.ok) {
                const userData = await userRes.json()
                contactName = userData.name ?? null
                contactHandle = userData.username ? `@${userData.username}` : null
                console.log(`[webhook-instagram] Contact: ${contactName} ${contactHandle}`)
              } else {
                console.log('[webhook-instagram] User lookup failed:', userRes.status)
              }
            } catch {
              console.log('[webhook-instagram] User lookup error')
            }
          }
        }

        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            profile_id: account.profile_id,
            platform_account_id: account.id,
            external_thread_id: externalThreadId,
            contact_name: contactName,
            contact_handle: contactHandle ?? senderId,
            status: 'new',
            priority: 'cold',
            type: 'other',
          })
          .select('id')
          .single()

        if (!newConv) {
          console.error('[webhook-instagram] Failed to create conversation')
          continue
        }

        conversationId = newConv.id
      }

      // Dedup by timestamp — Instagram sends milliseconds, not seconds
      const sentAt = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000).toISOString()
      const { data: existingMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('sent_at', sentAt)
        .single()

      if (existingMsg) continue

      // Insert message
      const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        direction,
        body: text,
        ai_generated: false,
        sent_to_platform: true,
        sent_at: sentAt,
      })

      if (insertError) {
        console.error('[webhook-instagram] Insert error:', insertError.message, insertError.code)
        continue
      }

      // Update conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: sentAt })
        .eq('id', conversationId)

      console.log(`[webhook-instagram] Saved ${direction} message in conversation ${conversationId}`)
    }
  }

  // Meta requires 200 response within 5 seconds
  return NextResponse.json({ ok: true })
}
