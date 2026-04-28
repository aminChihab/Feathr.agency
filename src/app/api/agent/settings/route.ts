import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAgentAuthorized } from '@/lib/agent-auth'

// GET /api/agent/settings?profile_id=xxx — Get research settings per platform
export async function GET(request: NextRequest) {
  // Allow both agent auth and user auth (for frontend)
  let profileId: string | null

  if (isAgentAuthorized(request)) {
    // Agent auth — profile_id from query param
    profileId = request.nextUrl.searchParams.get('profile_id')
  } else {
    // User auth for frontend calls — profile_id from x-user-id header
    profileId = request.headers.get('x-user-id')
  }

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
    twitter_handles: settings.twitter_handles ?? settings.competitor_handles ?? [],
    twitter_terms: settings.twitter_terms ?? settings.research_terms ?? [],
    instagram_handles: settings.instagram_handles ?? [],
    instagram_terms: settings.instagram_terms ?? [],
    discovered_twitter_handles: settings.discovered_twitter_handles ?? settings.discovered_handles ?? [],
    discovered_twitter_terms: settings.discovered_twitter_terms ?? settings.discovered_terms ?? [],
    discovered_instagram_handles: settings.discovered_instagram_handles ?? [],
    discovered_instagram_terms: settings.discovered_instagram_terms ?? [],
  })
}

// POST /api/agent/settings — Update research settings per platform
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { profile_id, platform, add_terms, remove_terms, add_handles, remove_handles } = body

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

  // Determine which keys to use based on platform
  const p = platform ?? 'twitter'
  const termsKey = `${p}_terms`
  const handlesKey = `${p}_handles`
  const discoveredTermsKey = `discovered_${p}_terms`
  const discoveredHandlesKey = `discovered_${p}_handles`

  let terms: string[] = settings[termsKey] ?? []
  let handles: string[] = settings[handlesKey] ?? []
  let discoveredTerms: string[] = settings[discoveredTermsKey] ?? []
  let discoveredHandles: string[] = settings[discoveredHandlesKey] ?? []

  // Migrate legacy keys on first use
  if (p === 'twitter' && terms.length === 0 && settings.research_terms?.length) {
    terms = settings.research_terms
  }
  if (p === 'twitter' && handles.length === 0 && settings.competitor_handles?.length) {
    handles = settings.competitor_handles
  }

  if (add_terms?.length) {
    const newTerms = add_terms.filter((t: string) => !terms.includes(t) && !discoveredTerms.includes(t))
    discoveredTerms = [...discoveredTerms, ...newTerms]
    terms = [...new Set([...terms, ...newTerms])]
  }

  if (remove_terms?.length) {
    terms = terms.filter((t: string) => !remove_terms.includes(t))
    discoveredTerms = discoveredTerms.filter((t: string) => !remove_terms.includes(t))
  }

  if (add_handles?.length) {
    const newHandles = add_handles.filter((h: string) => !handles.includes(h) && !discoveredHandles.includes(h))
    discoveredHandles = [...discoveredHandles, ...newHandles]
    handles = [...new Set([...handles, ...newHandles])]
  }

  if (remove_handles?.length) {
    handles = handles.filter((h: string) => !remove_handles.includes(h))
    discoveredHandles = discoveredHandles.filter((h: string) => !remove_handles.includes(h))
  }

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
        [termsKey]: terms,
        [handlesKey]: handles,
        [discoveredTermsKey]: discoveredTerms,
        [discoveredHandlesKey]: discoveredHandles,
      },
    })
    .eq('id', profile_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    [`${p}_handles`]: handles,
    [`${p}_terms`]: terms,
    [`discovered_${p}_handles`]: discoveredHandles,
    [`discovered_${p}_terms`]: discoveredTerms,
  })
}
