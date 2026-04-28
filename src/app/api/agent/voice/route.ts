import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { authorizeAgent, isAgentAuthorized } from '@/lib/agent-auth'
import { createNotification } from '@/lib/notify'

// GET /api/agent/voice?profile_id=xxx — Get current voice description + chat files
export async function GET(request: NextRequest) {
  const authResult = authorizeAgent(request, request.nextUrl.searchParams)
  if (authResult instanceof NextResponse) return authResult
  const { profileId } = authResult

  const supabase = createServiceClient()

  // Get current voice data
  const { data: profile } = await supabase
    .from('profiles')
    .select('voice_description, voice_sample')
    .eq('id', profileId)
    .single()

  // Get chat history files
  const { data: files } = await supabase.storage
    .from('chat-history')
    .list(profileId, { limit: 50 })

  // Read chat file contents
  const chatTexts: { file: string; content: string }[] = []
  let totalChars = 0
  const MAX_CHARS = 80000

  for (const file of files ?? []) {
    if (totalChars >= MAX_CHARS) break
    if (!file.name.endsWith('.txt')) continue

    const { data: blob } = await supabase.storage
      .from('chat-history')
      .download(`${profileId}/${file.name}`)

    if (blob) {
      const text = await blob.text()
      const trimmed = text.slice(0, MAX_CHARS - totalChars)
      chatTexts.push({ file: file.name, content: trimmed })
      totalChars += trimmed.length
    }
  }

  return NextResponse.json({
    voice_description: profile?.voice_description ?? null,
    current_voice_sample: profile?.voice_sample ?? null,
    chat_files: chatTexts,
    total_chars: totalChars,
  })
}

// POST /api/agent/voice — Save voice_sample (JSON from chat analysis)
export async function POST(request: NextRequest) {
  if (!isAgentAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, voice_sample } = body

  if (!profile_id || !voice_sample) {
    return NextResponse.json({ error: 'Missing profile_id or voice_sample' }, { status: 400 })
  }

  // Validate that voice_sample is valid JSON
  try {
    if (typeof voice_sample === 'string') {
      JSON.parse(voice_sample)
    }
  } catch {
    return NextResponse.json({ error: 'voice_sample must be valid JSON' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('profiles')
    .update({ voice_sample })
    .eq('id', profile_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createNotification(profile_id, 'system', 'Voice profile updated from chat analysis')

  return NextResponse.json({ ok: true })
}
