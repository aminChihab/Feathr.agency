// src/app/(dashboard)/content/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PostCard } from '@/components/dashboard/post-card'
import { PostModal } from '@/components/dashboard/post-modal'
import { MediaGrid } from '@/components/dashboard/media-grid'
import { Send } from 'lucide-react'

type CalendarItem = Database['public']['Tables']['content_calendar']['Row']

interface PostWithPlatform extends CalendarItem {
  platform_name: string
  platform_color: string
}

export default function ContentPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostWithPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editPost, setEditPost] = useState<CalendarItem | null>(null)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        loadPosts(user.id)
      }
    }
    init()
  }, [])

  async function loadPosts(uid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('content_calendar')
      .select('*, platform_accounts(platforms(name, color))')
      .eq('profile_id', uid)
      .order('scheduled_at', { ascending: false })

    const mapped: PostWithPlatform[] = (data ?? []).map((item: any) => ({
      ...item,
      platform_name: item.platform_accounts?.platforms?.name ?? 'Unknown',
      platform_color: item.platform_accounts?.platforms?.color ?? '#666',
    }))

    setPosts(mapped)
    setLoading(false)
  }

  async function handleApprove(id: string) {
    const post = posts.find((p) => p.id === id)
    const newStatus = post?.status === 'draft' ? 'approved' : 'draft'
    await supabase.from('content_calendar').update({ status: newStatus }).eq('id', id)
    if (userId) loadPosts(userId)
  }

  async function handleDelete(id: string) {
    await supabase.from('content_calendar').delete().eq('id', id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleRetry(id: string) {
    await supabase.from('content_calendar').update({ status: 'approved' }).eq('id', id)
    if (userId) loadPosts(userId)
  }

  function handleEdit(id: string) {
    const post = posts.find((p) => p.id === id)
    if (post) {
      setEditPost(post)
      setModalOpen(true)
    }
  }

  function handleNewPost() {
    setEditPost(null)
    setModalOpen(true)
  }

  async function handlePostNow() {
    setPosting(true)
    const res = await fetch('/api/post/process', { method: 'POST' })
    const data = await res.json()
    console.log('Post result:', data)
    if (userId) loadPosts(userId)
    setPosting(false)
  }

  // Group posts by date
  const grouped = posts.reduce<Record<string, PostWithPlatform[]>>((acc, post) => {
    const date = post.scheduled_at
      ? new Date(post.scheduled_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'Not scheduled'
    if (!acc[date]) acc[date] = []
    acc[date].push(post)
    return acc
  }, {})

  if (!userId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-light">Content</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePostNow} disabled={posting} className="text-xs">
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {posting ? 'Posting...' : 'Post now'}
          </Button>
          <Button onClick={handleNewPost} className="bg-accent text-white hover:bg-accent-hover">
            New post
          </Button>
        </div>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList className="bg-bg-surface gap-1 p-1">
          <TabsTrigger value="calendar" className="px-6 data-[state=active]:bg-accent data-[state=active]:text-white">Calendar</TabsTrigger>
          <TabsTrigger value="library" className="px-6 data-[state=active]:bg-accent data-[state=active]:text-white">Library</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-border bg-bg-surface p-12 text-center">
              <p className="text-text-muted">No posts yet. Create your first post to get started.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([date, datePosts]) => (
                <div key={date} className="space-y-2">
                  <h3 className="text-sm font-medium text-text-muted">{date}</h3>
                  {datePosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onApprove={handleApprove}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onRetry={handleRetry}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <MediaGrid supabase={supabase} userId={userId} />
        </TabsContent>
      </Tabs>

      <PostModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditPost(null) }}
        supabase={supabase}
        userId={userId}
        editPost={editPost}
        onSaved={() => loadPosts(userId)}
      />
    </div>
  )
}
