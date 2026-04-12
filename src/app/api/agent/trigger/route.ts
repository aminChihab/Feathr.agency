import { NextRequest, NextResponse } from 'next/server'

// POST /api/agent/trigger — Create a task in Paperclip for an agent
// Body: { agent: "media-analyst" | "research" | "content-writer", profile_id: "uuid", title: "...", description: "..." }
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    // Also allow calls from the app itself (no auth for internal use)
    // Check if it's a server-side call via cookie
    const cookie = request.headers.get('cookie')
    if (!cookie && !authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await request.json()
  const { agent, profile_id, title, description } = body

  if (!agent || !profile_id) {
    return NextResponse.json({ error: 'Missing agent and profile_id' }, { status: 400 })
  }

  const paperclipUrl = process.env.PAPERCLIP_API_URL
  const paperclipEmail = process.env.PAPERCLIP_EMAIL
  const paperclipPassword = process.env.PAPERCLIP_PASSWORD
  const paperclipCompanyId = process.env.PAPERCLIP_COMPANY_ID

  if (!paperclipUrl || !paperclipEmail || !paperclipPassword || !paperclipCompanyId) {
    console.error('[trigger] Missing Paperclip env vars')
    return NextResponse.json({ error: 'Paperclip not configured' }, { status: 500 })
  }

  // Agent slug to ID mapping
  const agentMap: Record<string, string> = {
    'media-analyst': process.env.PAPERCLIP_MEDIA_ANALYST_ID ?? '',
    'research': process.env.PAPERCLIP_RESEARCH_AGENT_ID ?? '',
    'content-writer': process.env.PAPERCLIP_CONTENT_WRITER_ID ?? '',
  }

  const agentId = agentMap[agent]
  if (!agentId) {
    return NextResponse.json({ error: `Unknown agent: ${agent}` }, { status: 400 })
  }

  try {
    // Login to Paperclip
    const loginRes = await fetch(`${paperclipUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: paperclipEmail, password: paperclipPassword }),
    })

    const sessionCookie = loginRes.headers.get('set-cookie')
    const cookieValue = sessionCookie?.split(';')[0] ?? ''

    if (!loginRes.ok) {
      console.error('[trigger] Paperclip login failed:', loginRes.status)
      return NextResponse.json({ error: 'Paperclip auth failed' }, { status: 500 })
    }

    // Create issue
    const issueRes = await fetch(`${paperclipUrl}/api/companies/${paperclipCompanyId}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieValue,
        'Origin': paperclipUrl,
      },
      body: JSON.stringify({
        title: title ?? `Analyze media for ${profile_id}`,
        body: description ?? `profile_id: ${profile_id}`,
        assigneeAgentId: agentId,
        priority: 'medium',
      }),
    })

    const issueData = await issueRes.json()
    console.log(`[trigger] Created task ${issueData.identifier} for ${agent}`)

    return NextResponse.json({
      task_id: issueData.id,
      identifier: issueData.identifier,
      agent,
    })
  } catch (err) {
    console.error('[trigger] Error:', err)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
