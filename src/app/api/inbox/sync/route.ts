// src/app/api/inbox/sync/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get connected Twitter accounts
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('id, credentials_encrypted, platforms!inner(slug)')
    .eq('profile_id', user.id)
    .eq('status', 'connected')

  const twitterAccounts = (accounts ?? []).filter(
    (a: any) => a.platforms?.slug === 'twitter'
  )

  if (twitterAccounts.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No Twitter accounts connected' })
  }

  let totalNewConversations = 0
  let totalNewMessages = 0

  for (const account of twitterAccounts) {
    const creds = JSON.parse(account.credentials_encrypted ?? '{}')
    const accessToken = creds.access_token

    if (!accessToken) continue

    try {
      // Fetch DM events from Twitter API v2
      const dmResponse = await fetch(
        'https://api.twitter.com/2/dm_events?dm_event.fields=id,text,created_at,dm_conversation_id,sender_id,participant_ids&max_results=100',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      if (!dmResponse.ok) {
        if (dmResponse.status === 401) {
          await supabase
            .from('platform_accounts')
            .update({ status: 'expired' })
            .eq('id', account.id)
        }
        continue
      }

      const dmData = await dmResponse.json()
      const events = dmData.data ?? []

      // Get authenticated user's Twitter ID for direction detection
      const meResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const meData = await meResponse.json()
      const myTwitterId = meData.data?.id

      // Group events by dm_conversation_id
      const grouped: Record<string, any[]> = {}
      for (const event of events) {
        const convId = event.dm_conversation_id
        if (!grouped[convId]) grouped[convId] = []
        grouped[convId].push(event)
      }

      for (const [dmConvId, dmEvents] of Object.entries(grouped)) {
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
        } else {
          // Get contact info from first inbound message
          const firstInbound = dmEvents.find((e: any) => e.sender_id !== myTwitterId)
          const senderId = firstInbound?.sender_id

          let contactName: string | null = null
          let contactHandle: string | null = null

          if (senderId) {
            try {
              const userResponse = await fetch(
                `https://api.twitter.com/2/users/${senderId}?user.fields=name,username`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              )
              if (userResponse.ok) {
                const userData = await userResponse.json()
                contactName = userData.data?.name ?? null
                contactHandle = userData.data?.username ? `@${userData.data.username}` : null
              }
            } catch {
              // Ignore user lookup failures
            }
          }

          const { data: newConv } = await supabase
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

          if (!newConv) continue
          conversationId = newConv.id
          totalNewConversations++
        }

        // Insert new messages
        for (const event of dmEvents as any[]) {
          const sentAt = event.created_at

          // Check if message already exists
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
            sent_at: sentAt,
          })

          totalNewMessages++
        }

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
      console.error('Twitter DM sync error:', error)
    }
  }

  return NextResponse.json({
    synced: twitterAccounts.length,
    new_conversations: totalNewConversations,
    new_messages: totalNewMessages,
  })
}
