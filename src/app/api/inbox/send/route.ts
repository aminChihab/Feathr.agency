// src/app/api/inbox/send/route.ts
import { NextResponse } from 'next/server'
import { sendUnsentMessagesForPlatform, type PlatformSendContext, type PlatformSendResult } from '@/lib/messaging'

// Twitter needs the authenticated user's own ID to identify the other participant.
// We fetch it once and reuse it across messages in the same request.
let cachedTwitterUserId: string | null = null

async function sendTwitterDM(ctx: PlatformSendContext): Promise<PlatformSendResult> {
  const accessToken = ctx.credentials.access_token
  if (!accessToken) {
    return { ok: false, error: 'missing access token' }
  }

  // Fetch my Twitter ID on the first message that needs it
  if (!cachedTwitterUserId) {
    const meResponse = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const meData = await meResponse.json()
    cachedTwitterUserId = meData.data?.id ?? null
    console.log('[twitter-send] My Twitter ID:', cachedTwitterUserId)
  }

  // Thread ID format: "id1-id2" — find the participant that isn't me
  const participantId = ctx.externalThreadId
    .split('-')
    .find((part) => part !== cachedTwitterUserId)

  if (!participantId) {
    return { ok: false, error: `could not determine participant from thread ${ctx.externalThreadId}` }
  }

  console.log('[twitter-send] Sending DM to participant:', participantId)

  const response = await fetch(
    `https://api.x.com/2/dm_conversations/with/${participantId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: ctx.messageBody }),
    },
  )

  console.log('[twitter-send] Twitter DM API response:', response.status)

  if (response.ok) {
    return { ok: true }
  }

  const errorBody = await response.text()
  console.error('[twitter-send] DM send failed:', errorBody)
  return {
    ok: false,
    tokenExpired: response.status === 401,
    error: `Twitter API ${response.status} — ${errorBody.slice(0, 200)}`,
  }
}

export async function POST() {
  // Reset per-request cache
  cachedTwitterUserId = null

  const result = await sendUnsentMessagesForPlatform('twitter', sendTwitterDM)
  return NextResponse.json(result)
}
