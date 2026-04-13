# Research System — Backend Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all API endpoints, database tables, and feathr-api commands needed by the three new research agents.

**Architecture:** New `notifications` table in Supabase. New API routes for agent notifications, performance data, performance rules, and Instagram sync. Extend the content-writer context endpoint with performance_rules and latest strategy reports. Update feathr-api script with new commands.

**Tech Stack:** Next.js 16 API routes, Supabase (Postgres + Storage), TypeScript

---

### Task 1: Create notifications table in Supabase

**Files:**
- Modify: Supabase dashboard (SQL editor)
- Modify: `src/types/database.ts`

- [ ] **Step 1: Create the notifications table via Supabase SQL editor**

Run this SQL in the Supabase dashboard:

```sql
CREATE TABLE notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('discovery', 'performance', 'system')),
  title text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  acted_on boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX idx_notifications_unread ON notifications(profile_id, read) WHERE read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
```

- [ ] **Step 2: Add performance_rules column to profiles**

```sql
ALTER TABLE profiles ADD COLUMN performance_rules jsonb DEFAULT NULL;
```

- [ ] **Step 3: Update TypeScript types**

Add to `src/types/database.ts` after the `profiles` table definition (after line ~803), before the closing of the `Tables` type:

```typescript
      notifications: {
        Row: {
          id: string
          profile_id: string
          type: string
          title: string
          body: Json
          read: boolean
          acted_on: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          type: string
          title: string
          body?: Json
          read?: boolean
          acted_on?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          type?: string
          title?: string
          body?: Json
          read?: boolean
          acted_on?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
```

Also add `performance_rules` to the profiles Row, Insert, and Update types:

```typescript
// In profiles Row (after voice_sample):
performance_rules: Json | null

// In profiles Insert:
performance_rules?: Json | null

// In profiles Update:
performance_rules?: Json | null
```

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add notifications table and performance_rules column to types"
```

---

### Task 2: Agent notifications endpoint

**Files:**
- Create: `src/app/api/agent/notifications/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/agent/notifications — Agent creates a notification
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, type, title, body: notifBody } = body

  if (!profile_id || !type || !title) {
    return NextResponse.json({ error: 'Missing profile_id, type, or title' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({ profile_id, type, title, body: notifBody ?? {} })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agent/notifications/route.ts
git commit -m "feat: agent notifications endpoint"
```

---

### Task 3: User notifications endpoints

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/count/route.ts`
- Create: `src/app/api/notifications/[id]/route.ts`

- [ ] **Step 1: Create GET /api/notifications**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notifications — Get own notifications
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ notifications: data ?? [] })
}
```

- [ ] **Step 2: Create GET /api/notifications/count**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notifications/count — Unread count for sidebar badge
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('read', false)

  return NextResponse.json({ count: count ?? 0 })
}
```

- [ ] **Step 3: Create PATCH /api/notifications/[id]**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/notifications/:id — Mark read/acted_on
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const update: any = {}
  if (body.read !== undefined) update.read = body.read
  if (body.acted_on !== undefined) update.acted_on = body.acted_on

  const { error } = await supabase
    .from('notifications')
    .update(update)
    .eq('id', id)
    .eq('profile_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/notifications/
git commit -m "feat: user notification endpoints — list, count, update"
```

---

### Task 4: Performance data endpoint

**Files:**
- Create: `src/app/api/agent/performance/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/agent/performance?profile_id=xxx — Performance data for analysis
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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Posted content with platform info
  const { data: postedItems } = await supabase
    .from('content_calendar')
    .select('id, caption, media_ids, scheduled_at, posted_at, status, platform_accounts(platforms(name, slug))')
    .eq('profile_id', profileId)
    .eq('status', 'posted')
    .gte('posted_at', thirtyDaysAgo)
    .order('posted_at', { ascending: false })

  // Posts table with engagement metrics
  const { data: postMetrics } = await supabase
    .from('posts')
    .select('calendar_item_id, post_url, impressions, engagement, clicks, platform_accounts(platforms(name, slug))')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Analytics — daily stats
  const { data: analytics } = await supabase
    .from('analytics')
    .select('date, followers, impressions, engagement, platform_accounts(platforms(name, slug))')
    .eq('profile_id', profileId)
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: false })

  // Media metadata for posted items
  const allMediaIds = new Set<string>()
  for (const item of postedItems ?? []) {
    const ids = item.media_ids as string[] | null
    if (ids) ids.forEach((id) => allMediaIds.add(id))
  }

  let mediaInfo: any[] = []
  if (allMediaIds.size > 0) {
    const { data } = await supabase
      .from('content_library')
      .select('id, file_type, tags, metadata')
      .in('id', Array.from(allMediaIds))
    mediaInfo = (data ?? []).map((m) => ({
      id: m.id,
      file_type: m.file_type,
      tags: m.tags,
      description: (m.metadata as any)?.description ?? null,
    }))
  }

  // Current follower counts per platform
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('id, username, metadata, platforms(name, slug)')
    .eq('profile_id', profileId)
    .eq('status', 'connected')

  return NextResponse.json({
    posted_items: postedItems ?? [],
    post_metrics: postMetrics ?? [],
    analytics: analytics ?? [],
    media_info: mediaInfo,
    accounts: accounts ?? [],
  })
}

// POST /api/agent/performance — Save performance_rules
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile_id, performance_rules } = body

  if (!profile_id || !performance_rules) {
    return NextResponse.json({ error: 'Missing profile_id or performance_rules' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('profiles')
    .update({ performance_rules })
    .eq('id', profile_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agent/performance/route.ts
git commit -m "feat: performance data + rules endpoints for Performance Analyst agent"
```

---

### Task 5: Instagram sync endpoint

**Files:**
- Create: `src/app/api/research/sync-instagram/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get Instagram account
  const { data: igAccount } = await supabase
    .from('platform_accounts')
    .select('id, credentials_encrypted, metadata, platforms!inner(slug)')
    .eq('profile_id', user.id)
    .eq('status', 'connected')
    .eq('platforms.slug', 'instagram')
    .single()

  if (!igAccount) {
    return NextResponse.json({ error: 'No connected Instagram account' }, { status: 400 })
  }

  const creds = decryptCredentials(igAccount.credentials_encrypted ?? '{}')
  const accessToken = creds.access_token
  const igUserId = (igAccount.metadata as any)?.instagram_user_id ?? creds.instagram_user_id

  if (!accessToken || !igUserId) {
    return NextResponse.json({ error: 'Missing Instagram credentials' }, { status: 400 })
  }

  // Load research settings
  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .single()

  const settings = (profile?.settings as any) ?? {}
  const competitorHandles: string[] = settings.competitor_handles ?? []

  let competitorReports = 0
  const errors: string[] = []

  // For each competitor, try to find their IG business account and get recent media
  for (const handle of competitorHandles) {
    try {
      // Search for business account by username via Instagram Graph API
      const searchRes = await fetch(
        `https://graph.instagram.com/v22.0/${igUserId}?fields=business_discovery.fields(username,name,biography,followers_count,follows_count,media_count,media.limit(12){caption,timestamp,like_count,comments_count,media_type,permalink}).username(${handle})&access_token=${accessToken}`
      )

      if (!searchRes.ok) {
        const err = await searchRes.text()
        console.log(`[ig-sync] Profile @${handle}: ${searchRes.status}`)
        errors.push(`@${handle}: ${searchRes.status}`)
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }

      const data = await searchRes.json()
      const discovery = data.business_discovery

      if (!discovery) {
        errors.push(`@${handle}: not a business/creator account`)
        continue
      }

      const recentMedia = (discovery.media?.data ?? []).map((m: any) => ({
        caption: m.caption ?? '',
        timestamp: m.timestamp,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        media_type: m.media_type,
        permalink: m.permalink,
      }))

      await supabase.from('research_reports').insert({
        profile_id: user.id,
        type: 'competitor',
        title: `IG Competitor: @${handle}`,
        body: {
          handle,
          platform: 'instagram',
          scraped_at: new Date().toISOString(),
          profile: {
            display_name: discovery.name ?? handle,
            bio: discovery.biography ?? '',
            followers: discovery.followers_count ?? 0,
            following: discovery.follows_count ?? 0,
            post_count: discovery.media_count ?? 0,
          },
          recent_posts: recentMedia,
        },
      })

      competitorReports++
      await new Promise((r) => setTimeout(r, 1000))
    } catch (err) {
      errors.push(`@${handle}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({
    competitor_reports: competitorReports,
    errors: errors.length > 0 ? errors : undefined,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/research/sync-instagram/route.ts
git commit -m "feat: Instagram research sync endpoint using business_discovery API"
```

---

### Task 6: Extend content-writer context with performance_rules and strategy reports

**Files:**
- Modify: `src/app/api/agent/context/route.ts:82-151`

- [ ] **Step 1: Update the content-writer section**

Replace the content-writer section (lines 82-151) of `src/app/api/agent/context/route.ts`:

```typescript
  if (type === 'content-writer') {
    // Get profile + voice + performance rules
    const { data: profile } = await supabase
      .from('profiles')
      .select('professional_name, city, goals, voice_description, voice_sample, performance_rules')
      .eq('id', profileId)
      .single()

    // Get latest research reports for content ideas
    const { data: reports } = await supabase
      .from('research_reports')
      .select('type, title, body, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Extract latest strategy reports by type
    const latestXStrategy = reports?.find((r) => (r.body as any)?.type === 'x_strategy')
    const latestIGStrategy = reports?.find((r) => (r.body as any)?.type === 'ig_strategy')

    // Get connected platforms
    const { data: platforms } = await supabase
      .from('platform_accounts')
      .select('id, username, schedule_json, platforms(name, slug, capabilities)')
      .eq('profile_id', profileId)
      .eq('status', 'connected')

    // Get recent posts to avoid repetition
    const { data: recentPosts } = await supabase
      .from('content_calendar')
      .select('caption, media_ids, platform_accounts(platforms(name))')
      .eq('profile_id', profileId)
      .in('status', ['posted', 'approved', 'draft'])
      .order('created_at', { ascending: false })
      .limit(30)

    // Collect all media IDs already used in posts
    const usedMediaIds = new Set<string>()
    for (const post of recentPosts ?? []) {
      const ids = (post as any).media_ids as string[] | null
      if (ids) ids.forEach((id: string) => usedMediaIds.add(id))
    }

    // Get media library with descriptions — exclude already-used media
    const { data: mediaItems } = await supabase
      .from('content_library')
      .select('id, file_name, file_type, tags, metadata')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50)

    const media = (mediaItems ?? [])
      .filter((item) => !usedMediaIds.has(item.id))
      .map((item) => ({
        id: item.id,
        file_name: item.file_name,
        file_type: item.file_type,
        tags: item.tags,
        description: (item.metadata as any)?.description ?? null,
      }))

    return NextResponse.json({
      profile: {
        name: profile?.professional_name,
        city: profile?.city,
        goals: profile?.goals,
        voice_description: profile?.voice_description,
        voice_sample: profile?.voice_sample,
      },
      performance_rules: profile?.performance_rules ?? null,
      latest_x_strategy: latestXStrategy?.body ?? null,
      latest_ig_strategy: latestIGStrategy?.body ?? null,
      research_reports: reports ?? [],
      platforms: platforms ?? [],
      recent_posts: recentPosts ?? [],
      media,
    })
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agent/context/route.ts
git commit -m "feat: extend content-writer context with performance_rules and strategy reports"
```

---

### Task 7: Update feathr-api script with new commands

**Files:**
- Modify: VPS `/docker/paperclip-bhfa/data/feathr-api.sh`

- [ ] **Step 1: SSH and update the script**

```bash
ssh root@187.127.69.225 'cat > /docker/paperclip-bhfa/data/feathr-api.sh << '"'"'SCRIPT'"'"'
#!/bin/bash
ACTION=$1
PROFILE_ID=$2
API_URL="${FEATHR_API_URL}"
SECRET="${FEATHR_AGENT_SECRET}"

case "$ACTION" in
  context-research) curl -s "${API_URL}/api/agent/context?type=research&profile_id=${PROFILE_ID}" -H "Authorization: Bearer ${SECRET}" ;;
  context-writer) curl -s "${API_URL}/api/agent/context?type=content-writer&profile_id=${PROFILE_ID}" -H "Authorization: Bearer ${SECRET}" ;;
  media-unanalyzed) curl -s "${API_URL}/api/agent/media?profile_id=${PROFILE_ID}" -H "Authorization: Bearer ${SECRET}" ;;
  get-voice) curl -s "${API_URL}/api/agent/voice?profile_id=${PROFILE_ID}" -H "Authorization: Bearer ${SECRET}" ;;
  save-voice) curl -s -X POST "${API_URL}/api/agent/voice" -H "Authorization: Bearer ${SECRET}" -H "Content-Type: application/json" -d @- ;;
  get-settings) curl -s "${API_URL}/api/agent/settings?profile_id=${PROFILE_ID}" -H "Authorization: Bearer ${SECRET}" ;;
  save-settings) curl -s -X POST "${API_URL}/api/agent/settings" -H "Authorization: Bearer ${SECRET}" -H "Content-Type: application/json" -d @- ;;
  save-notification) curl -s -X POST "${API_URL}/api/agent/notifications" -H "Authorization: Bearer ${SECRET}" -H "Content-Type: application/json" -d @- ;;
  get-performance) curl -s "${API_URL}/api/agent/performance?profile_id=${PROFILE_ID}" -H "Authorization: Bearer ${SECRET}" ;;
  save-performance-rules) curl -s -X POST "${API_URL}/api/agent/performance" -H "Authorization: Bearer ${SECRET}" -H "Content-Type: application/json" -d @- ;;
  save-report) curl -s -X POST "${API_URL}/api/agent/report" -H "Authorization: Bearer ${SECRET}" -H "Content-Type: application/json" -d @- ;;
  save-drafts) curl -s -X POST "${API_URL}/api/agent/drafts" -H "Authorization: Bearer ${SECRET}" -H "Content-Type: application/json" -d @- ;;
  save-media-descriptions) curl -s -X POST "${API_URL}/api/agent/media" -H "Authorization: Bearer ${SECRET}" -H "Content-Type: application/json" -d @- ;;
  *) echo "Usage: feathr-api {context-research|context-writer|media-unanalyzed|get-voice|save-voice|get-settings|save-settings|save-notification|get-performance|save-performance-rules|save-report|save-drafts|save-media-descriptions} <profile_id>" ;;
esac
SCRIPT
chmod +x /docker/paperclip-bhfa/data/feathr-api.sh'
```

- [ ] **Step 2: Restore the symlink**

```bash
ssh root@187.127.69.225 "docker exec --user root paperclip-bhfa-paperclip-1 ln -sf /paperclip/feathr-api.sh /usr/local/bin/feathr-api"
```

- [ ] **Step 3: Verify**

```bash
ssh root@187.127.69.225 "docker exec paperclip-bhfa-paperclip-1 feathr-api"
```

Expected: Usage line showing all commands including get-settings, save-notification, get-performance, save-performance-rules.

---

### Task 8: Update trigger route with new agent IDs

**Files:**
- Modify: `src/app/api/agent/trigger/route.ts:31-36`
- Modify: `.env.local`

- [ ] **Step 1: Update agentMap**

In `src/app/api/agent/trigger/route.ts`, replace lines 31-36:

```typescript
  const agentMap: Record<string, string> = {
    'media-analyst': process.env.PAPERCLIP_MEDIA_ANALYST_ID ?? '',
    'x-strategist': process.env.PAPERCLIP_X_STRATEGIST_ID ?? '',
    'ig-strategist': process.env.PAPERCLIP_IG_STRATEGIST_ID ?? '',
    'performance-analyst': process.env.PAPERCLIP_PERFORMANCE_ANALYST_ID ?? '',
    'content-writer': process.env.PAPERCLIP_CONTENT_WRITER_ID ?? '',
    'chat-analyzer': process.env.PAPERCLIP_CHAT_ANALYZER_ID ?? '',
  }
```

Note: the old `'research'` key is removed. The Research Agent is deprecated.

- [ ] **Step 2: Add env vars to .env.local**

Append to `.env.local`:

```
PAPERCLIP_X_STRATEGIST_ID=<will be set after agent creation in plan 2>
PAPERCLIP_IG_STRATEGIST_ID=<will be set after agent creation in plan 2>
PAPERCLIP_PERFORMANCE_ANALYST_ID=<will be set after agent creation in plan 2>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/agent/trigger/route.ts
git commit -m "feat: update trigger route with new research agent IDs"
```
