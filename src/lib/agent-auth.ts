import { NextResponse } from 'next/server'

/**
 * Validates that the request carries a valid agent bearer token.
 * Returns the profile_id from the query string on success, or an error response.
 */
export function authorizeAgent(
  request: Request,
  searchParams: URLSearchParams
): { profileId: string } | NextResponse {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profileId = searchParams.get('profile_id')
  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 })
  }

  return { profileId }
}

/** Simple boolean check for routes that handle profile_id from the body. */
export function isAgentAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET
  return !!expectedSecret && authHeader === `Bearer ${expectedSecret}`
}
