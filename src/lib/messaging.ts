import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'

interface OutboundMessage {
  id: string
  body: string
  conversation_id: string
  conversations: {
    external_thread_id: string
    platform_account_id: string
    platform_accounts: {
      credentials_encrypted: string
      platforms: { slug: string }
    }
  }
}

export interface PlatformSendContext {
  messageId: string
  messageBody: string
  externalThreadId: string
  platformAccountId: string
  credentials: Record<string, string>
}

export interface PlatformSendResult {
  ok: boolean
  error?: string
  tokenExpired?: boolean
}

export type PlatformSendFn = (ctx: PlatformSendContext) => Promise<PlatformSendResult>

export interface SendMessagesResult {
  sent: number
  errors?: string[]
}

/**
 * Shared pipeline for sending outbound messages on a given platform.
 *
 * Handles: auth → fetch unsent messages → filter to user's conversations →
 * call platform-specific send → mark sent → collect errors.
 */
export async function sendUnsentMessagesForPlatform(
  platformSlug: string,
  sendViaPlatform: PlatformSendFn,
): Promise<SendMessagesResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const logTag = `[${platformSlug}-send]`
  console.log(`${logTag} Starting for user:`, user.id)

  const { data: unsentMessages } = await supabase
    .from('messages')
    .select('id, body, conversation_id, conversations(external_thread_id, platform_account_id, platform_accounts(credentials_encrypted, platforms(slug)))')
    .eq('direction', 'outbound')
    .eq('sent_to_platform', false)

  const { data: userConversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('profile_id', user.id)

  const userConversationIds = new Set((userConversations ?? []).map((c) => c.id))

  const platformMessages = ((unsentMessages ?? []) as unknown as OutboundMessage[]).filter(
    (msg) =>
      userConversationIds.has(msg.conversation_id) &&
      msg.conversations?.platform_accounts?.platforms?.slug === platformSlug,
  )

  console.log(`${logTag} Found`, platformMessages.length, `unsent message(s)`)

  if (platformMessages.length === 0) {
    return { sent: 0 }
  }

  let sent = 0
  const errors: string[] = []

  for (const msg of platformMessages) {
    const conv = msg.conversations
    const externalThreadId = conv?.external_thread_id
    const platformAccountId = conv?.platform_account_id

    if (!externalThreadId) {
      errors.push(`Message ${msg.id}: no external thread ID`)
      continue
    }

    const credentials = decryptCredentials(conv?.platform_accounts?.credentials_encrypted ?? '{}')

    const sendContext: PlatformSendContext = {
      messageId: msg.id,
      messageBody: msg.body,
      externalThreadId,
      platformAccountId,
      credentials,
    }

    try {
      const result = await sendViaPlatform(sendContext)

      if (result.ok) {
        await supabase.from('messages').update({ sent_to_platform: true }).eq('id', msg.id)
        sent++
        console.log(`${logTag} Sent message:`, msg.id)
      } else {
        if (result.tokenExpired) {
          await supabase.from('platform_accounts').update({ status: 'expired' }).eq('id', platformAccountId)
        }
        errors.push(`Message ${msg.id}: ${result.error}`)
      }
    } catch (error) {
      console.error(`${logTag} Error:`, error)
      errors.push(`Message ${msg.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const result: SendMessagesResult = { sent, errors: errors.length > 0 ? errors : undefined }
  console.log(`${logTag} Done:`, JSON.stringify(result))
  return result
}
