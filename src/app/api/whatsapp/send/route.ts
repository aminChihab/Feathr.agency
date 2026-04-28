import { NextResponse } from 'next/server'
import { sendUnsentMessagesForPlatform, type PlatformSendContext, type PlatformSendResult } from '@/lib/messaging'

async function sendWhatsAppMessage(ctx: PlatformSendContext): Promise<PlatformSendResult> {
  const accessToken = ctx.credentials.access_token
  const phoneNumberId = ctx.credentials.whatsapp_phone_number_id

  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'missing access token or phone number ID' }
  }

  // Thread ID format: "wa-{phone}"
  const recipientPhone = ctx.externalThreadId.replace('wa-', '')

  console.log(`[wa-send] Sending to ${recipientPhone}: "${ctx.messageBody.slice(0, 50)}"`)

  const response = await fetch(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: { body: ctx.messageBody },
      }),
    },
  )

  console.log(`[wa-send] API response: ${response.status}`)

  if (response.ok) {
    return { ok: true }
  }

  const errorBody = await response.text()
  console.error('[wa-send] Send failed:', errorBody)
  return { ok: false, error: `${response.status} — ${errorBody.slice(0, 200)}` }
}

export async function POST() {
  const result = await sendUnsentMessagesForPlatform('whatsapp', sendWhatsAppMessage)
  return NextResponse.json(result)
}
