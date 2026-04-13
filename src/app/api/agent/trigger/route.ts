import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/agent/trigger — Create a task in Paperclip for an agent
// Body: { agent: "media-analyst" | "research" | "content-writer", profile_id: "uuid", title?: "...", media_ids?: string[] }
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { agent, profile_id, title, media_ids } = body

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

  const agentMap: Record<string, string> = {
    'media-analyst': process.env.PAPERCLIP_MEDIA_ANALYST_ID ?? '',
    'x-strategist': process.env.PAPERCLIP_X_STRATEGIST_ID ?? '',
    'ig-strategist': process.env.PAPERCLIP_IG_STRATEGIST_ID ?? '',
    'performance-analyst': process.env.PAPERCLIP_PERFORMANCE_ANALYST_ID ?? '',
    'content-writer': process.env.PAPERCLIP_CONTENT_WRITER_ID ?? '',
    'chat-analyzer': process.env.PAPERCLIP_CHAT_ANALYZER_ID ?? '',
  }

  const agentId = agentMap[agent]
  if (!agentId) {
    return NextResponse.json({ error: `Unknown agent: ${agent}` }, { status: 400 })
  }

  // Build task description based on agent type
  let description = `profile_id: ${profile_id}\n`

  if (agent === 'media-analyst' && media_ids?.length) {
    const supabase = createServiceClient()

    // Get media items and generate signed URLs
    const { data: items } = await supabase
      .from('content_library')
      .select('id, file_name, file_type, storage_path, thumbnail_path, metadata')
      .in('id', media_ids)

    if (items) {
      for (const item of items) {
        description += `\n--- Media: ${item.file_name} (${item.file_type}) ---\n`
        description += `media_id: ${item.id}\n`

        if (item.file_type === 'photo') {
          const { data: signed } = await supabase.storage
            .from('media')
            .createSignedUrl(item.storage_path, 7200) // 2 hours
          if (signed?.signedUrl) {
            const head = await fetch(signed.signedUrl, { method: 'HEAD' })
            if (head.ok) description += `image: ${signed.signedUrl}\n`
          }
        } else if (item.file_type === 'video') {
          const meta = item.metadata as any
          const framePaths: string[] = meta?.frame_paths ?? []
          let frameCount = 0

          if (framePaths.length > 0) {
            const validFrames: string[] = []
            for (const fp of framePaths) {
              const { data: signed } = await supabase.storage
                .from('media')
                .createSignedUrl(fp, 7200)
              if (signed?.signedUrl) {
                const head = await fetch(signed.signedUrl, { method: 'HEAD' })
                if (head.ok) validFrames.push(signed.signedUrl)
              }
            }
            if (validFrames.length > 0) {
              description += `video_frames:\n`
              for (let f = 0; f < validFrames.length; f++) {
                description += `  frame_${f + 1}: ${validFrames[f]}\n`
              }
            }
          } else if (item.thumbnail_path) {
            const { data: signed } = await supabase.storage
              .from('media')
              .createSignedUrl(item.thumbnail_path, 7200)
            if (signed?.signedUrl) {
              const head = await fetch(signed.signedUrl, { method: 'HEAD' })
              if (head.ok) description += `thumbnail: ${signed.signedUrl}\n`
            }
          }
        }
      }
    }
  }

  try {
    // Login to Paperclip
    const loginRes = await fetch(`${paperclipUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': paperclipUrl,
      },
      body: JSON.stringify({ email: paperclipEmail, password: paperclipPassword }),
    })

    if (!loginRes.ok) {
      const errBody = await loginRes.text()
      console.error('[trigger] Paperclip login failed:', loginRes.status, 'URL:', `${paperclipUrl}/api/auth/sign-in/email`, 'Body:', errBody.slice(0, 200))
      return NextResponse.json({ error: 'Paperclip auth failed', status: loginRes.status, detail: errBody.slice(0, 200) }, { status: 500 })
    }

    const sessionCookie = loginRes.headers.get('set-cookie')
    const cookieValue = sessionCookie?.split(';')[0] ?? ''

    console.log(`[trigger] Using agentId=${agentId}, companyId=${paperclipCompanyId}`)

    // Create issue with status todo
    const issueRes = await fetch(`${paperclipUrl}/api/companies/${paperclipCompanyId}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieValue,
        'Origin': paperclipUrl,
      },
      body: JSON.stringify({
        title: title ?? `Analyze media for ${profile_id}`,
        description: description,
        assigneeAgentId: agentId,
        status: 'todo',
        priority: 'medium',
      }),
    })

    if (!issueRes.ok) {
      const errBody = await issueRes.text()
      console.error('[trigger] Issue creation failed:', issueRes.status, errBody.slice(0, 300))
      return NextResponse.json({ error: 'Failed to create issue', status: issueRes.status, detail: errBody.slice(0, 300) }, { status: 500 })
    }

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
