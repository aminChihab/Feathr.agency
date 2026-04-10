import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[wa-send] Starting for user:', user.id)

  // Get unsent outbound messages from WhatsApp conversations
  const { data: unsentMessages } = await supabase
    .from('messages')
    .select('id, body, conversation_id, conversations(external_thread_id, platform_account_id, platform_accounts(credentials_encrypted, platforms(slug)))')
    .eq('direction', 'outbound')
    .eq('sent_to_platform', false)

  // Filter to WhatsApp conversations owned by this user
  const { data: userConvIds } = await supabase
    .from('conversations')
    .select('id')
    .eq('profile_id', user.id)

  const userConvIdSet = new Set((userConvIds ?? []).map((c: any) => c.id))
  const messages = (unsentMessages ?? []).filter((m: any) =>
    userConvIdSet.has(m.conversation_id) &&
    (m as any).conversations?.platform_accounts?.platforms?.slug === 'whatsapp'
  )

  console.log('[wa-send] Found', messages.length, 'unsent WhatsApp message(s)')

  if (messages.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No unsent WhatsApp messages' })
  }

  let sent = 0
  const errors: string[] = []

  for (const msg of messages) {
    const conv = (msg as any).conversations
    const account = conv?.platform_accounts
    const externalThreadId = conv?.external_thread_id

    if (!externalThreadId) {
      errors.push(`Message ${msg.id}: no external thread ID`)
      continue
    }

    const creds = decryptCredentials(account?.credentials_encrypted ?? '{}')
    const accessToken = creds.access_token
    const phoneNumberId = creds.whatsapp_phone_number_id

    if (!accessToken || !phoneNumberId) {
      errors.push(`Message ${msg.id}: missing token or phone number ID`)
      continue
    }

    // Extract recipient phone from external thread ID (format: wa-{phone})
    const recipientPhone = externalThreadId.replace('wa-', '')

    console.log(`[wa-send] Sending to ${recipientPhone}: "${msg.body.slice(0, 50)}"`)

    try {
      const response = await fetch(
        `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipientPhone,
            type: 'text',
            text: { body: msg.body },
          }),
        }
      )

      console.log(`[wa-send] API response: ${response.status}`)

      if (response.ok) {
        await supabase.from('messages').update({ sent_to_platform: true }).eq('id', msg.id)
        sent++
      } else {
        const errorBody = await response.text()
        console.error(`[wa-send] Send failed:`, errorBody)
        errors.push(`Message ${msg.id}: ${response.status} — ${errorBody.slice(0, 200)}`)
      }
    } catch (error) {
      console.error('[wa-send] Error:', error)
      errors.push(`Message ${msg.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const result = { sent, errors: errors.length > 0 ? errors : undefined }
  console.log('[wa-send] Done:', JSON.stringify(result))
  return NextResponse.json(result)
}
