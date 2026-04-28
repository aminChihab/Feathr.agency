import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAgentAuthorized, authorizeAgent } from '@/lib/agent-auth'

// POST /api/agent/foxy-prompts — Content Writer creates prompt queue entries
// Body: { profile_id, prompts: [{ draft_id, content_description, aspect_ratio? }] }
export async function POST(request: NextRequest) {
  if (!isAgentAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, prompts } = body

  if (!profile_id || !prompts || !Array.isArray(prompts) || prompts.length === 0) {
    return NextResponse.json({ error: 'Missing fields: profile_id, prompts (array)' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const results = []
  const errors = []

  for (const item of prompts) {
    const { draft_id, content_description, aspect_ratio, slide_type, slide_order } = item

    if (!draft_id) {
      errors.push('Missing draft_id in prompt request')
      continue
    }

    const { data, error } = await supabase
      .from('foxy_prompt_queue')
      .insert({
        profile_id,
        draft_id,
        prompt: content_description ?? '',
        aspect_ratio: aspect_ratio ?? '4/5',
        slide_type: slide_type ?? 'single',
        slide_order: slide_order ?? 0,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      errors.push(`Insert error for draft ${draft_id}: ${error.message}`)
    } else {
      results.push({ id: data.id, draft_id })
    }
  }

  return NextResponse.json({
    created: results.length,
    queue_items: results,
    errors: errors.length > 0 ? errors : undefined,
  })
}

// PUT /api/agent/foxy-prompts — Prompt Writer updates queue entries with actual prompts
// Body: { prompts: [{ queue_id, prompt, example_id?, aspect_ratio? }] }
export async function PUT(request: NextRequest) {
  if (!isAgentAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { prompts } = body

  if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
    return NextResponse.json({ error: 'Missing fields: prompts (array)' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const results = []
  const errors = []

  for (const item of prompts) {
    const { queue_id, prompt, example_id, aspect_ratio } = item

    if (!queue_id || (!prompt && !example_id)) {
      errors.push(`Missing queue_id or prompt/example_id`)
      continue
    }

    const update: Record<string, any> = { status: 'ready' }
    if (prompt) update.prompt = prompt
    if (example_id) update.example_id = example_id
    if (aspect_ratio) update.aspect_ratio = aspect_ratio

    const { error } = await supabase
      .from('foxy_prompt_queue')
      .update(update)
      .eq('id', queue_id)
      .eq('status', 'pending')

    if (error) {
      errors.push(`Update error for ${queue_id}: ${error.message}`)
    } else {
      results.push({ queue_id })
    }
  }

  return NextResponse.json({
    updated: results.length,
    queue_items: results,
    errors: errors.length > 0 ? errors : undefined,
  })
}

// GET /api/agent/foxy-prompts?profile_id=...&status=pending — Prompt Writer reads queue
export async function GET(request: NextRequest) {
  const authResult = authorizeAgent(request, request.nextUrl.searchParams)
  if (authResult instanceof NextResponse) return authResult
  const { profileId } = authResult

  const status = request.nextUrl.searchParams.get('status') ?? 'pending'

  const supabase = createServiceClient()

  // Get queue items with their draft captions for context
  const { data, error } = await supabase
    .from('foxy_prompt_queue')
    .select('id, profile_id, draft_id, prompt, example_id, aspect_ratio, status, created_at')
    .eq('profile_id', profileId)
    .eq('status', status)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with draft captions
  const draftIds = (data ?? []).map(d => d.draft_id).filter(Boolean)
  let drafts: Record<string, string> = {}

  if (draftIds.length > 0) {
    const { data: draftRows } = await supabase
      .from('content_calendar')
      .select('id, caption')
      .in('id', draftIds)

    drafts = Object.fromEntries((draftRows ?? []).map(d => [d.id, d.caption ?? '']))
  }

  const enriched = (data ?? []).map(item => ({
    ...item,
    draft_caption: drafts[item.draft_id] ?? null,
  }))

  return NextResponse.json({ queue_items: enriched })
}
