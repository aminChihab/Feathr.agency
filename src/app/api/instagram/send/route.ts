import { NextResponse } from 'next/server'
import { sendUnsentMessagesForPlatform, type PlatformSendContext, type PlatformSendResult } from '@/lib/messaging'
import { INSTAGRAM_API_VERSION } from '@/lib/instagram'

async function sendInstagramMessage(ctx: PlatformSendContext): Promise<PlatformSendResult> {
  const accessToken = ctx.credentials.access_token
  const igUserId = ctx.credentials.instagram_user_id

  if (!accessToken || !igUserId) {
    return { ok: false, error: 'missing access token or IG user ID' }
  }

  // Thread ID format: "ig-id1-id2" — find the participant that isn't us
  const recipientId = ctx.externalThreadId
    .replace('ig-', '')
    .split('-')
    .find((part) => part !== igUserId)

  if (!recipientId) {
    return { ok: false, error: 'could not determine recipient' }
  }

  console.log(`[ig-send] Sending to ${recipientId}: "${ctx.messageBody.slice(0, 50)}"`)

  const response = await fetch(
    `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/me/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: ctx.messageBody },
      }),
    },
  )

  console.log(`[ig-send] API response: ${response.status}`)

  if (response.ok) {
    return { ok: true }
  }

  const errorBody = await response.text()
  console.error('[ig-send] Send failed:', errorBody)
  return { ok: false, error: `${response.status} — ${errorBody.slice(0, 200)}` }
}

export async function POST() {
  const result = await sendUnsentMessagesForPlatform('instagram', sendInstagramMessage)
  return NextResponse.json(result)
}
