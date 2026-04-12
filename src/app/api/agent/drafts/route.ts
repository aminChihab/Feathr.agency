import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/agent/drafts — Agent creates draft posts in content calendar
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, drafts } = body

  if (!profile_id || !drafts || !Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: 'Missing fields: profile_id, drafts (array)' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const results = []
  const errors = []

  for (const draft of drafts) {
    const { platform_slug, caption, scheduled_at } = draft

    if (!platform_slug || !caption) {
      errors.push(`Missing platform_slug or caption in draft`)
      continue
    }

    // Find the platform account for this slug
    const { data: account } = await supabase
      .from('platform_accounts')
      .select('id, platforms!inner(slug)')
      .eq('profile_id', profile_id)
      .eq('status', 'connected')
      .eq('platforms.slug', platform_slug)
      .single()

    if (!account) {
      errors.push(`No connected ${platform_slug} account found`)
      continue
    }

    const { data: created, error: insertError } = await supabase
      .from('content_calendar')
      .insert({
        profile_id,
        platform_account_id: account.id,
        caption,
        scheduled_at: scheduled_at ?? null,
        status: 'draft',
        ai_generated: true,
      })
      .select('id')
      .single()

    if (insertError) {
      errors.push(`Insert error: ${insertError.message}`)
    } else {
      results.push({ id: created.id, platform: platform_slug, caption: caption.slice(0, 50) })
    }
  }

  return NextResponse.json({
    created: results.length,
    drafts: results,
    errors: errors.length > 0 ? errors : undefined,
  })
}
