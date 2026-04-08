import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[sync] Starting DM sync for user:', user.id)

  // Get connected Twitter accounts
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('id, credentials_encrypted, platforms!inner(slug)')
    .eq('profile_id', user.id)
    .eq('status', 'connected')

  const twitterAccounts = (accounts ?? []).filter(
    (a: any) => a.platforms?.slug === 'twitter'
  )

  console.log('[sync] Found', twitterAccounts.length, 'Twitter account(s)')

  if (twitterAccounts.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No Twitter accounts connected' })
  }

  let totalNewConversations = 0
  let totalNewMessages = 0
  const errors: string[] = []

  for (const account of twitterAccounts) {
    const creds = decryptCredentials(account.credentials_encrypted ?? '{}')
    const accessToken = creds.access_token

    if (!accessToken) {
      console.log('[sync] Account', account.id, '— no access_token in credentials')
      errors.push(`Account ${account.id}: no access_token found`)
      continue
    }

    console.log('[sync] Fetching DMs for account:', account.id)

    try {
      // Fetch DM events from Twitter API v2
      const dmUrl = 'https://api.twitter.com/2/dm_events?dm_event.fields=id,text,created_at,dm_conversation_id,sender_id,participant_ids&max_results=100'
      console.log('[sync] GET', dmUrl)

      const dmResponse = await fetch(dmUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      console.log('[sync] Twitter DM API response:', dmResponse.status, dmResponse.statusText)

      if (!dmResponse.ok) {
        const errorBody = await dmResponse.text()
        console.error('[sync] Twitter DM API error body:', errorBody)

        if (dmResponse.status === 401) {
          console.log('[sync] Token expired, marking account as expired')
          await supabase
            .from('platform_accounts')
            .update({ status: 'expired' })
            .eq('id', account.id)
          errors.push(`Account ${account.id}: token expired (401)`)
        } else {
          errors.push(`Account ${account.id}: Twitter API ${dmResponse.status} — ${errorBody.slice(0, 200)}`)
        }
        continue
      }

      const dmData = await dmResponse.json()
      const events = dmData.data ?? []
      console.log('[sync] Received', events.length, 'DM event(s)')
      if (events.length > 0) {
        console.log('[sync] Sample event:', JSON.stringify(events[0], null, 2))
      }

      // Get authenticated user's Twitter ID FIRST (needed for direction + contact extraction)
      const meResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const meData = await meResponse.json()
      const myTwitterId = meData.data?.id as string | undefined
      console.log('[sync] Authenticated as Twitter user:', myTwitterId, meData.data?.username)

      if (!myTwitterId) {
        console.error('[sync] Could not determine Twitter user ID, skipping account')
        errors.push(`Account ${account.id}: /users/me returned no ID`)
        continue
      }

      if (events.length === 0) {
        console.log('[sync] No DM events found')
        continue
      }

      // Group events by dm_conversation_id
      const grouped: Record<string, any[]> = {}
      for (const event of events) {
        const convId = event.dm_conversation_id
        if (!grouped[convId]) grouped[convId] = []
        grouped[convId].push(event)
      }

      console.log('[sync] Grouped into', Object.keys(grouped).length, 'conversation(s)')

      for (const [dmConvId, dmEvents] of Object.entries(grouped)) {
        console.log('[sync] Processing conversation:', dmConvId, '—', dmEvents.length, 'event(s)')

        // Find or create conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('profile_id', user.id)
          .eq('external_thread_id', dmConvId)
          .single()

        let conversationId: string

        if (existingConv) {
          conversationId = existingConv.id
          console.log('[sync] Existing conversation:', conversationId)
        } else {
          // Find the other participant's ID
          // The dm_conversation_id format is "userId1-userId2" — extract the one that isn't us
          const convIdParts = dmConvId.split('-')
          const otherParticipantId = convIdParts.find((p: string) => p !== myTwitterId) ?? null

          // Also check inbound messages for sender_id as fallback
          const firstInbound = dmEvents.find((e: any) => e.sender_id !== myTwitterId)
          const senderId = otherParticipantId ?? firstInbound?.sender_id ?? null

          console.log('[sync] Other participant ID:', senderId, '(from conv ID:', otherParticipantId, ', from inbound:', firstInbound?.sender_id, ')')

          let contactName: string | null = null
          let contactHandle: string | null = null

          if (senderId) {
            console.log('[sync] Looking up Twitter user:', senderId)
            try {
              const userResponse = await fetch(
                `https://api.twitter.com/2/users/${senderId}?user.fields=name,username`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              )
              if (userResponse.ok) {
                const userData = await userResponse.json()
                contactName = userData.data?.name ?? null
                contactHandle = userData.data?.username ? `@${userData.data.username}` : null
                console.log('[sync] Contact:', contactName, contactHandle)
              } else {
                console.log('[sync] User lookup failed:', userResponse.status)
              }
            } catch (e) {
              console.log('[sync] User lookup error:', e)
            }
          }

          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              profile_id: user.id,
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

          if (convError) {
            console.error('[sync] Failed to create conversation:', convError.message)
            continue
          }
          if (!newConv) continue

          conversationId = newConv.id
          totalNewConversations++
          console.log('[sync] Created conversation:', conversationId)
        }

        // Insert new messages
        let newInConv = 0
        let skippedInConv = 0

        for (const event of dmEvents as any[]) {
          const sentAt = event.created_at

          // Check if message already exists
          const { data: existingMsg } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('sent_at', sentAt)
            .single()

          if (existingMsg) {
            skippedInConv++
            continue
          }

          const direction = event.sender_id === myTwitterId ? 'outbound' : 'inbound'

          const { error: msgError } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            direction,
            body: event.text ?? '',
            ai_generated: false,
            sent_to_platform: true,
            sent_at: sentAt,
          })

          if (msgError) {
            console.error('[sync] Failed to insert message:', msgError.message)
          } else {
            newInConv++
            totalNewMessages++
          }
        }

        console.log(`[sync] Conversation ${dmConvId}: ${newInConv} new, ${skippedInConv} skipped`)

        // Update last_message_at
        const latestEvent = dmEvents.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]

        if (latestEvent) {
          await supabase
            .from('conversations')
            .update({ last_message_at: latestEvent.created_at })
            .eq('id', conversationId)
        }
      }
    } catch (error) {
      console.error('[sync] Twitter DM sync error:', error)
      errors.push(`Account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const result = {
    synced: twitterAccounts.length,
    new_conversations: totalNewConversations,
    new_messages: totalNewMessages,
    errors: errors.length > 0 ? errors : undefined,
  }

  console.log('[sync] Done:', JSON.stringify(result))

  return NextResponse.json(result)
}
