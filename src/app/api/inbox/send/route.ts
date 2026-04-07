// src/app/api/inbox/send/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[dm-send] Starting for user:', user.id)

  // Get unsent outbound messages with conversation + platform info
  const { data: unsentMessages } = await supabase
    .from('messages')
    .select('id, body, conversation_id, conversations(external_thread_id, platform_account_id, platform_accounts(credentials_encrypted, platforms(slug)))')
    .eq('direction', 'outbound')
    .eq('ai_generated', false)
    .eq('sent_to_platform', false)

  // Filter to only messages in conversations owned by this user
  const { data: userConvIds } = await supabase
    .from('conversations')
    .select('id')
    .eq('profile_id', user.id)

  const userConvIdSet = new Set((userConvIds ?? []).map((c: any) => c.id))
  const messages = (unsentMessages ?? []).filter((m: any) => userConvIdSet.has(m.conversation_id))

  console.log('[dm-send] Found', messages.length, 'unsent message(s)')

  if (messages.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No unsent messages' })
  }

  // Get the user's Twitter ID for participant extraction
  let myTwitterId: string | null = null

  let sent = 0
  const errors: string[] = []

  for (const msg of messages) {
    const conv = (msg as any).conversations
    const account = conv?.platform_accounts
    const platformSlug = account?.platforms?.slug

    if (platformSlug !== 'twitter') {
      console.log('[dm-send] Skipping non-Twitter message:', msg.id)
      continue
    }

    const creds = JSON.parse(account?.credentials_encrypted ?? '{}')
    const accessToken = creds.access_token
    const externalThreadId = conv?.external_thread_id

    if (!accessToken || !externalThreadId) {
      errors.push(`Message ${msg.id}: missing token or thread ID`)
      continue
    }

    // Get my Twitter ID (once)
    if (!myTwitterId) {
      try {
        const meRes = await fetch('https://api.x.com/2/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const meData = await meRes.json()
        myTwitterId = meData.data?.id ?? null
        console.log('[dm-send] My Twitter ID:', myTwitterId)
      } catch {
        errors.push('Could not fetch Twitter user ID')
        continue
      }
    }

    // Extract the other participant from the thread ID (format: "id1-id2")
    const parts = externalThreadId.split('-')
    const participantId = parts.find((p: string) => p !== myTwitterId)

    if (!participantId) {
      errors.push(`Message ${msg.id}: could not determine participant from thread ${externalThreadId}`)
      continue
    }

    console.log('[dm-send] Sending DM to participant:', participantId)

    try {
      const response = await fetch(
        `https://api.x.com/2/dm_conversations/with/${participantId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: msg.body }),
        }
      )

      console.log('[dm-send] Twitter DM API response:', response.status)

      if (response.ok) {
        await supabase.from('messages').update({ sent_to_platform: true }).eq('id', msg.id)
        sent++
        console.log('[dm-send] Sent message:', msg.id)
      } else {
        const errorBody = await response.text()
        console.error('[dm-send] DM send failed:', errorBody)

        if (response.status === 401) {
          await supabase.from('platform_accounts').update({ status: 'expired' }).eq('id', conv.platform_account_id)
        }
        errors.push(`Message ${msg.id}: Twitter API ${response.status} — ${errorBody.slice(0, 200)}`)
      }
    } catch (error) {
      console.error('[dm-send] Error:', error)
      errors.push(`Message ${msg.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const result = { sent, errors: errors.length > 0 ? errors : undefined }
  console.log('[dm-send] Done:', JSON.stringify(result))
  return NextResponse.json(result)
}
