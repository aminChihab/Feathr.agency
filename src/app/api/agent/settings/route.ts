import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/agent/settings?profile_id=xxx — Get research settings
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profileId = request.nextUrl.searchParams.get('profile_id')
  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', profileId)
    .single()

  const settings = (profile?.settings as any) ?? {}

  return NextResponse.json({
    research_terms: settings.research_terms ?? [],
    competitor_handles: settings.competitor_handles ?? [],
    discovered_terms: settings.discovered_terms ?? [],
    discovered_handles: settings.discovered_handles ?? [],
  })
}

// POST /api/agent/settings — Update research settings (merge discovered items)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, add_terms, remove_terms, add_handles, remove_handles } = body

  if (!profile_id) {
    return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', profile_id)
    .single()

  const settings = (profile?.settings as any) ?? {}
  let terms: string[] = settings.research_terms ?? []
  let handles: string[] = settings.competitor_handles ?? []
  let discoveredTerms: string[] = settings.discovered_terms ?? []
  let discoveredHandles: string[] = settings.discovered_handles ?? []

  // Add new terms (to discovered list, not overwriting user's originals)
  if (add_terms?.length) {
    const newTerms = add_terms.filter((t: string) => !terms.includes(t) && !discoveredTerms.includes(t))
    discoveredTerms = [...discoveredTerms, ...newTerms]
    // Also add to active terms so they get searched next time
    terms = [...new Set([...terms, ...newTerms])]
  }

  // Remove terms
  if (remove_terms?.length) {
    terms = terms.filter((t: string) => !remove_terms.includes(t))
    discoveredTerms = discoveredTerms.filter((t: string) => !remove_terms.includes(t))
  }

  // Add new handles
  if (add_handles?.length) {
    const newHandles = add_handles.filter((h: string) => !handles.includes(h) && !discoveredHandles.includes(h))
    discoveredHandles = [...discoveredHandles, ...newHandles]
    handles = [...new Set([...handles, ...newHandles])]
  }

  // Remove handles
  if (remove_handles?.length) {
    handles = handles.filter((h: string) => !remove_handles.includes(h))
    discoveredHandles = discoveredHandles.filter((h: string) => !remove_handles.includes(h))
  }

  // Cap to prevent unbounded growth
  const MAX_TERMS = 30
  const MAX_HANDLES = 25
  terms = terms.slice(0, MAX_TERMS)
  handles = handles.slice(0, MAX_HANDLES)
  discoveredTerms = discoveredTerms.slice(0, MAX_TERMS)
  discoveredHandles = discoveredHandles.slice(0, MAX_HANDLES)

  const { error } = await supabase
    .from('profiles')
    .update({
      settings: {
        ...settings,
        research_terms: terms,
        competitor_handles: handles,
        discovered_terms: discoveredTerms,
        discovered_handles: discoveredHandles,
      },
    })
    .eq('id', profile_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    research_terms: terms,
    competitor_handles: handles,
    discovered_terms: discoveredTerms,
    discovered_handles: discoveredHandles,
  })
}
