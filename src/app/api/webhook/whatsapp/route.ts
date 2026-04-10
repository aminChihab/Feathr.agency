import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient as createServerClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — Meta webhook verification (same as Instagram)
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token')

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && verifyToken === expectedToken && challenge) {
    console.log('[webhook-whatsapp] Verification challenge accepted')
    return new NextResponse(challenge, { status: 200 })
  }

  console.error('[webhook-whatsapp] Verification failed')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST — Receive WhatsApp messaging events
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Verify signature
  const signature = request.headers.get('x-hub-signature-256')
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET

  if (signature && appSecret) {
    const expectedSig = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
    if (signature !== expectedSig) {
      console.warn('[webhook-whatsapp] Signature mismatch — allowing through')
    }
  }

  const body = JSON.parse(rawBody)

  console.log('[webhook-whatsapp] Event received:', JSON.stringify(body).slice(0, 500))

  // WhatsApp webhook format: { object: 'whatsapp_business_account', entry: [...] }
  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // Find WhatsApp platform
  const { data: whatsappPlatform } = await supabase
    .from('platforms')
    .select('id')
    .eq('slug', 'whatsapp')
    .single()

  if (!whatsappPlatform) {
    console.error('[webhook-whatsapp] WhatsApp platform not found')
    return NextResponse.json({ ok: true })
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue

      const value = change.value
      const phoneNumberId = value.metadata?.phone_number_id
      const contacts = value.contacts ?? []
      const messages = value.messages ?? []

      // Find matching platform account
      const { data: accounts } = await supabase
        .from('platform_accounts')
        .select('id, profile_id, metadata')
        .eq('platform_id', whatsappPlatform.id)
        .eq('status', 'connected')

      const account = accounts?.find(
        (a: any) => (a.metadata as any)?.whatsapp_phone_number_id === phoneNumberId
      ) ?? accounts?.[0]

      if (!account) {
        console.log('[webhook-whatsapp] No matching WhatsApp account for', phoneNumberId)
        continue
      }

      for (const msg of messages) {
        const senderId = msg.from // phone number
        const text = msg.text?.body ?? ''
        const timestamp = msg.timestamp
        const messageId = msg.id

        if (!text || !senderId) continue

        console.log(`[webhook-whatsapp] Inbound from ${senderId}: "${text.slice(0, 50)}"`)

        // Get contact name from contacts array
        const contact = contacts.find((c: any) => c.wa_id === senderId)
        const contactName = contact?.profile?.name ?? null

        // Build external thread ID
        const externalThreadId = `wa-${senderId}`

        // Find or create conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id, contact_name')
          .eq('profile_id', account.profile_id)
          .eq('external_thread_id', externalThreadId)
          .single()

        let conversationId: string

        if (existingConv) {
          conversationId = existingConv.id

          // Update name if missing
          if (!existingConv.contact_name && contactName) {
            await supabase.from('conversations').update({
              contact_name: contactName,
            }).eq('id', conversationId)
          }
        } else {
          console.log(`[webhook-whatsapp] New conversation with ${contactName ?? senderId}`)

          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              profile_id: account.profile_id,
              platform_account_id: account.id,
              external_thread_id: externalThreadId,
              contact_name: contactName,
              contact_handle: senderId,
              status: 'new',
              priority: 'cold',
              type: 'other',
            })
            .select('id')
            .single()

          if (!newConv) {
            console.error('[webhook-whatsapp] Failed to create conversation')
            continue
          }

          conversationId = newConv.id
        }

        // Dedup by message ID or timestamp
        const sentAt = new Date(parseInt(timestamp) * 1000).toISOString()

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
          direction: 'inbound' as const,
          body: text,
          ai_generated: false,
          sent_to_platform: true,
          sent_at: sentAt,
        })

        if (insertError) {
          console.error('[webhook-whatsapp] Insert error:', insertError.message)
          continue
        }

        // Update conversation
        await supabase
          .from('conversations')
          .update({ last_message_at: sentAt })
          .eq('id', conversationId)

        console.log(`[webhook-whatsapp] Saved inbound message in conversation ${conversationId}`)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
