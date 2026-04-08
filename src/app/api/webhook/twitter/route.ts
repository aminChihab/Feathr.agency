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
// Webhook = instant notification, then we fetch actual message content via API
export async function POST(request: NextRequest) {
  const body = await request.json()

  const eventData = body.data
  if (!eventData) {
    return NextResponse.json({ ok: true })
  }

  const eventType = eventData.event_type
  console.log(`[webhook-twitter] Event: ${eventType}`)

  // Only trigger sync for inbound DM/chat events
  if (eventType !== 'dm.received' && eventType !== 'chat.received') {
    console.log(`[webhook-twitter] Ignoring event type: ${eventType}`)
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // Find the twitter platform account
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

  if (!twitterAccounts || twitterAccounts.length === 0) {
    console.log('[webhook-twitter] No connected Twitter accounts')
    return NextResponse.json({ ok: true })
  }

  // For each connected account, fetch latest DMs via API (gives us plaintext)
  for (const account of twitterAccounts) {
    const creds = JSON.parse(account.credentials_encrypted ?? '{}')
    const accessToken = creds.access_token

    if (!accessToken) continue

    console.log(`[webhook-twitter] Fetching DMs for account ${account.id}`)

    try {
      // Get authenticated user's Twitter ID
      const meRes = await fetch('https://api.x.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!meRes.ok) {
        if (meRes.status === 401) {
          await supabase.from('platform_accounts').update({ status: 'expired' }).eq('id', account.id)
          console.log('[webhook-twitter] Token expired, marked account')
        }
        continue
      }

      const meData = await meRes.json()
      const myTwitterId = meData.data?.id

      if (!myTwitterId) continue

      // Fetch recent DM events
      const dmRes = await fetch(
        'https://api.x.com/2/dm_events?dm_event.fields=id,text,created_at,dm_conversation_id,sender_id&max_results=20',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      console.log(`[webhook-twitter] DM API response: ${dmRes.status}`)

      if (!dmRes.ok) {
        const errBody = await dmRes.text()
        console.error('[webhook-twitter] DM API error:', errBody)
        continue
      }

      const dmData = await dmRes.json()
      const events = dmData.data ?? []

      console.log(`[webhook-twitter] Fetched ${events.length} DM event(s)`)

      // Log first event to see the structure
      if (events.length > 0) {
        console.log('[webhook-twitter] Sample event:', JSON.stringify(events[0]))
      }

      // Group by conversation
      const grouped: Record<string, any[]> = {}
      for (const event of events) {
        const convId = event.dm_conversation_id
        if (!convId) {
          console.log('[webhook-twitter] Event missing dm_conversation_id:', JSON.stringify(event).slice(0, 200))
          continue
        }
        if (!grouped[convId]) grouped[convId] = []
        grouped[convId].push(event)
      }

      console.log(`[webhook-twitter] Grouped into ${Object.keys(grouped).length} conversation(s)`)

      for (const [dmConvId, dmEvents] of Object.entries(grouped)) {
        // Extract other participant from conv ID
        const convIdParts = dmConvId.split('-')
        const otherParticipantId = convIdParts.find((p: string) => p !== myTwitterId) ?? null

        // Find or create conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('profile_id', account.profile_id)
          .eq('external_thread_id', dmConvId)
          .single()

        let conversationId: string

        if (existingConv) {
          conversationId = existingConv.id
        } else {
          // Look up contact name
          let contactName: string | null = null
          let contactHandle: string | null = null

          if (otherParticipantId) {
            try {
              const userRes = await fetch(
                `https://api.x.com/2/users/${otherParticipantId}?user.fields=name,username`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              )
              if (userRes.ok) {
                const userData = await userRes.json()
                contactName = userData.data?.name ?? null
                contactHandle = userData.data?.username ? `@${userData.data.username}` : null
              }
            } catch {
              // Skip user lookup failures
            }
          }

          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              profile_id: account.profile_id,
              platform_account_id: account.id,
              external_thread_id: dmConvId,
              contact_name: contactName,
              contact_handle: contactHandle,
              status: 'new',
              priority: 'cold',
              type: 'other',
            })
            .select('id')
            .single()

          if (!newConv) continue
          conversationId = newConv.id
          console.log(`[webhook-twitter] New conversation: ${conversationId} with ${contactName}`)
        }

        // Insert new messages
        for (const event of dmEvents as any[]) {
          const sentAt = event.created_at

          // Dedup
          const { data: existingMsg } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('sent_at', sentAt)
            .single()

          if (existingMsg) continue

          const direction = event.sender_id === myTwitterId ? 'outbound' : 'inbound'

          await supabase.from('messages').insert({
            conversation_id: conversationId,
            direction,
            body: event.text ?? '',
            ai_generated: false,
            sent_to_platform: true,
            sent_at: sentAt,
          })

          console.log(`[webhook-twitter] Saved ${direction} message: "${(event.text ?? '').slice(0, 50)}"`)
        }

        // Update last_message_at
        const latest = dmEvents.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]

        if (latest) {
          await supabase
            .from('conversations')
            .update({ last_message_at: latest.created_at })
            .eq('id', conversationId)
        }
      }
    } catch (err) {
      console.error('[webhook-twitter] Error:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
