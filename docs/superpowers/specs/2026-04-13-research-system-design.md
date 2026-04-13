# Research System Redesign

## Goal

Replace the single Research Agent with three specialized agents that provide platform-specific growth strategies, competitor intelligence, and performance optimization. The system discovers new opportunities, prunes irrelevant targets, and feeds actionable rules directly to the Content Writer.

## Architecture

Three agents replace the current Research Agent:

```
X/Twitter Strategist ──→ X strategy rapport + discoveries ──→ Content Writer (X posts)
Instagram Strategist ──→ IG strategy rapport + discoveries ──→ Content Writer (IG posts)
Performance Analyst  ──→ performance_rules (do/dont)       ──→ Content Writer (optimization)
```

All three communicate via the existing `feathr-api` CLI and Next.js API routes. No direct database access.

## Agents

### X/Twitter Strategist

**Purpose:** Discover what works on X/Twitter in the creator's niche. Provide growth strategies focused on conversation, replies, and engagement.

**Data sources:**
- Twitter API v2: search tweets by terms, competitor profiles + tweets
- Engagement patterns: which replies get likes, which conversations are active
- Current `research_terms` + `competitor_handles` from settings

**Per-run workflow:**
1. Fetch current settings via `feathr-api get-settings <profile_id>`
2. Scrape Twitter data (existing sync flow)
3. Analyze: trending hashtags, high-engagement accounts, reply opportunities
4. Discover: new relevant accounts and hashtags from the data
5. Prune: evaluate existing terms/handles — flag irrelevant ones for removal
6. Save rapport via `feathr-api save-report`
7. Save suggestions via `feathr-api save-notification`

**Rapport structure:**
```json
{
  "type": "x_strategy",
  "trending_hashtags": [{ "tag": "...", "growth": "...", "relevance": "..." }],
  "reply_opportunities": [{ "tweet_url": "...", "author": "@...", "why": "..." }],
  "content_ideas": [{ "idea": "...", "hook_type": "contrarian|confession|...", "example": "..." }],
  "competitor_insights": [{ "handle": "@...", "what_works": "...", "takeaway": "..." }],
  "suggestions": {
    "add_accounts": [{ "handle": "@...", "reason": "..." }],
    "add_hashtags": [{ "tag": "...", "reason": "..." }],
    "remove_accounts": [{ "handle": "@...", "reason": "..." }],
    "remove_hashtags": [{ "tag": "...", "reason": "..." }]
  }
}
```

**Evaluation criteria for prune decisions:**
- Relevance: does the term still return niche-relevant results?
- Quality: are found tweets/accounts actually in the niche?
- Duplication: do multiple terms return the same results?
- Activity: is the competitor account still active?

**Hard caps:** max 30 terms total, max 25 handles total (across all platforms combined). Settings are shared — both strategists read from and write to the same lists, with a `platform` tag per item to distinguish X vs IG targets.

---

### Instagram Strategist

**Purpose:** Discover what works on Instagram in the creator's niche. Focus on visual trends, reel formats, carousel strategies, and hashtag discovery.

**Data sources (phase 1 — Graph API):**
- Instagram Graph API: competitor posts/reels, media info, follower counts
- Own Instagram posts via `instagram_manage_insights`
- Hashtag search via `instagram_basic`

**Per-run workflow:**
1. Fetch current settings via `feathr-api get-settings <profile_id>`
2. Scrape Instagram data via Graph API (new sync logic)
3. Analyze: trending reel formats, carousel patterns, engagement rates, media styles
4. Discover: new accounts and hashtags
5. Prune: evaluate existing targets
6. Save rapport via `feathr-api save-report`
7. Save suggestions via `feathr-api save-notification`

**Rapport structure:**
```json
{
  "type": "ig_strategy",
  "trending_formats": [{ "format": "...", "why": "...", "example_accounts": ["@..."] }],
  "hashtag_strategy": [{ "tag": "#...", "reach": "...", "competition": "low|mid|high" }],
  "content_ideas": [{ "idea": "...", "format": "reel|carousel|single", "media_style": "..." }],
  "competitor_insights": [{ "handle": "@...", "posting_frequency": "...", "best_performing": "...", "takeaway": "..." }],
  "media_style_tips": [{ "tip": "...", "based_on": "..." }],
  "suggestions": {
    "add_accounts": [{ "handle": "@...", "reason": "..." }],
    "add_hashtags": [{ "tag": "#...", "reason": "..." }],
    "remove_accounts": [{ "handle": "@...", "reason": "..." }],
    "remove_hashtags": [{ "tag": "#...", "reason": "..." }]
  }
}
```

**Key difference from X Strategist:** Instagram is visual-first. Strategy is about formats, aesthetics, and media style — not conversation. "Discover what looks work and replicate" vs X's "join conversations and build relationships."

**Phase 2 (later):** Add Crawlee-based scraping for richer data (engagement rates, full caption analysis, story patterns).

---

### Performance Analyst

**Purpose:** Analyze own posted content performance across all platforms. Produce concrete optimization rules for the Content Writer.

**Data sources:**
- `content_calendar` — all posted items with media_ids, caption, platform, timestamps
- `posts` table — post URLs, engagement metrics
- `analytics` table — daily followers, impressions, engagement per platform
- `content_library` — media metadata (descriptions, tags) of posted items

**Per-run workflow:**
1. Fetch performance data via `feathr-api get-performance <profile_id>` (new endpoint)
2. Analyze patterns:
   - Which posts got highest engagement? Why? (media type, time, caption style, hashtags)
   - Which media style works? (based on tags/descriptions of posted media vs engagement)
   - Best days and times per platform
   - Which hook/caption format performs best
   - Posts with media vs text-only
3. Write concrete `performance_rules` — actionable do/dont per platform
4. Save rules to `profiles.performance_rules` via `feathr-api save-performance-rules`
5. Save rapport via `feathr-api save-report`

**Trigger:** After every 10 posted items, or minimum 1x per week.

**Output — performance_rules (saved to profiles):**
```json
{
  "twitter": {
    "do": ["Post between 16:00-18:00 CET", "Use 1 image per tweet", "Confession hooks get 2x more replies"],
    "dont": ["Never post before 14:00", "Avoid hashtag #X"],
    "best_media_tags": ["intimate", "warm lighting", "close-up"],
    "best_times": "16:00-18:00 CET",
    "best_days": "Tuesday, Thursday, Saturday"
  },
  "instagram": {
    "do": ["Carrousels get 3x more saves than singles", "Post reels on Thursday"],
    "dont": ["Avoid posting 2 days in a row without media"],
    "best_media_tags": ["lifestyle", "elegant", "evening"],
    "best_times": "17:00-19:00 CET",
    "best_days": "Wednesday, Friday, Saturday"
  }
}
```

**Rapport structure:**
```json
{
  "type": "performance",
  "period": "2026-04-01 to 2026-04-13",
  "top_posts": [{ "caption_preview": "...", "platform": "...", "engagement": "...", "why": "..." }],
  "worst_posts": [{ "caption_preview": "...", "platform": "...", "engagement": "...", "why": "..." }],
  "platform_rules": { ... },
  "media_insights": { "best_performing_tags": [...], "worst_performing_tags": [...] },
  "timing_insights": { "best_times": {...}, "best_days": {...} },
  "growth_status": "growing|stable|declining"
}
```

---

## Notification System

### Database — `notifications` table

```
id: uuid PK
profile_id: uuid FK → profiles
type: 'discovery' | 'performance' | 'system'
title: string
body: json
read: boolean (default false)
acted_on: boolean (default false)
created_at: timestamp
```

### Discovery notification body

```json
{
  "source": "x_strategist" | "ig_strategist",
  "platform": "twitter" | "instagram",
  "add_accounts": [{ "handle": "@...", "reason": "..." }],
  "add_hashtags": [{ "tag": "...", "reason": "..." }],
  "remove_accounts": [{ "handle": "@...", "reason": "..." }],
  "remove_hashtags": [{ "tag": "...", "reason": "..." }]
}
```

### API endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/agent/notifications` | POST | AGENT_SECRET | Agents create notifications |
| `/api/notifications` | GET | User auth | Get own notifications |
| `/api/notifications/:id` | PATCH | User auth | Mark read/acted_on |
| `/api/notifications/count` | GET | User auth | Unread count (for sidebar badge) |

### Sidebar

- Bell icon in sidebar nav with unread count badge
- Click navigates to `/research` page (for discovery notifications)
- Badge disappears when all notifications are read/acted_on

### Accept flow

- Accept on add_account → `POST /api/agent/settings` (add to active list) + Twitter/IG follow API call
- Accept on add_hashtag → `POST /api/agent/settings` (add to active list)
- Accept on remove → `POST /api/agent/settings` (remove from active list)
- Dismiss → marks notification item as acted_on, no action taken

---

## Research Page Redesign

### Layout (top to bottom)

**1. Suggestions banner** (only when pending suggestions exist)
- Grouped by source: X Strategist | IG Strategist
- Each item shows: handle/tag + reason + Accept / Dismiss buttons
- Prune suggestions separately: "No longer relevant" section
- Bulk accept/dismiss option

**2. Active research targets**
- Two sections: Accounts | Hashtags/Terms
- Grouped by platform (X | Instagram)
- Visual indicator for discovered (agent-found) vs user-added
- Inline add/remove for manual management

**3. AI Reports** (existing, enhanced)
- Filter tabs: X Strategy | IG Strategy | Performance | All
- Existing card UI with the new rapport structures
- Most recent report default open

---

## Content Writer Integration

### Extended context endpoint

`GET /api/agent/context?type=content-writer` adds:

```json
{
  "performance_rules": {
    "twitter": { "do": [...], "dont": [...], "best_media_tags": [...], ... },
    "instagram": { "do": [...], "dont": [...], "best_media_tags": [...], ... }
  },
  "latest_x_strategy": {
    "content_ideas": [...],
    "trending_hashtags": [...],
    "reply_opportunities": [...]
  },
  "latest_ig_strategy": {
    "content_ideas": [...],
    "trending_formats": [...],
    "hashtag_strategy": [...]
  }
}
```

### Priority order for Content Writer

1. `performance_rules` — hard rules from Performance Analyst, always follow
2. `voice_sample` + `voice_description` — how to write
3. `latest_x_strategy` / `latest_ig_strategy` — inspiration and trending topics
4. `media` — available media to match

### New database field

- `profiles.performance_rules` — JSON, written by Performance Analyst, read by Content Writer

---

## New API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/agent/settings` | GET | Agent reads research settings (existing) |
| `/api/agent/settings` | POST | Agent updates settings — add/remove terms/handles (existing) |
| `/api/agent/notifications` | POST | Agent creates notification |
| `/api/agent/performance` | GET | Agent reads performance data for analysis |
| `/api/agent/performance-rules` | POST | Agent saves performance_rules to profile |
| `/api/notifications` | GET | User reads own notifications |
| `/api/notifications/:id` | PATCH | User marks notification read/acted_on |
| `/api/notifications/count` | GET | Unread count for sidebar badge |
| `/api/research/sync-instagram` | POST | Instagram data sync (new) |

## New `feathr-api` Commands

```
get-settings <profile_id>       — current research terms + handles
save-notification                — create notification (pipe JSON)
get-performance <profile_id>    — performance data for analysis
save-performance-rules           — save performance_rules (pipe JSON)
```

---

## New Paperclip Agents

| Agent | Replaces | Paperclip ID | Needs |
|---|---|---|---|
| X/Twitter Strategist | Research Agent (partially) | New | AGENTS.md |
| Instagram Strategist | — | New | AGENTS.md |
| Performance Analyst | — | New | AGENTS.md |

The current Research Agent (`263eae76-641f-4236-bd6f-935676bb2728`) is deprecated and replaced by the X Strategist for Twitter-specific work.

---

## Triggering

### Manual (now)

"New Research" button on Research page triggers all three agents sequentially:
1. Twitter sync → X Strategist agent
2. Instagram sync → IG Strategist agent
3. Performance Analyst agent (no sync needed, reads from DB)

### Automated (later — separate spec)

Cron-based triggering with adaptive frequency based on account size and user goals. Not in scope for this spec.

---

## Out of Scope

- Crawlee web scraping (phase 2 for Instagram, separate spec)
- Directory site scraping (Kinky.nl, Slixa — separate spec)
- Automated cron scheduling (later phase)
- WhatsApp/Telegram research
