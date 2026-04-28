// src/components/dashboard/post-card-view.tsx
'use client'

import { Check, Pencil, X } from 'lucide-react'
import { StatusBadge } from '@/components/dashboard/status-badge'
import type { PostWithPlatform } from '@/lib/calendar'

interface MediaThumb {
  id: string
  url: string
  file_type: string
}

interface PostCardActions {
  onApprove: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

interface PostCardViewProps {
  post: PostWithPlatform
  variant: 'grid' | 'list'
  mediaThumbs: Record<string, MediaThumb>
  actions?: PostCardActions
}

export function PostCardView({ post, variant, mediaThumbs, actions }: PostCardViewProps) {
  const ids = post.media_ids as string[] | null
  const firstThumb = ids?.[0] ? mediaThumbs[ids[0]] : null

  if (variant === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
        {/* Small thumbnail */}
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container shrink-0">
          {firstThumb ? (
            <img src={firstThumb.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20 text-[9px] uppercase">No img</div>
          )}
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-on-surface truncate">{post.caption || 'No caption'}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: post.platform_color ?? '#666' }} />
            <span className="text-xs text-on-surface-variant">{post.platform_name}</span>
          </div>
        </div>
        {/* Date */}
        <div className="text-right shrink-0">
          <p className="font-display text-sm text-on-surface">
            {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unscheduled'}
          </p>
          <p className="text-[10px] text-on-surface-variant">
            {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
          </p>
        </div>
        {/* Status + Actions */}
        <StatusBadge status={post.status} />
        {actions && (
          <div className="flex items-center gap-1">
            <button onClick={() => actions.onApprove(post.id)} className="p-1.5 rounded-full hover:bg-primary/20 text-primary transition-colors"><Check className="h-4 w-4" /></button>
            <button onClick={() => actions.onEdit(post.id)} className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => actions.onDelete(post.id)} className="p-1.5 rounded-full hover:bg-error/20 text-error transition-colors"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>
    )
  }

  // Grid view
  return (
    <div className={`bg-surface-container-low rounded-2xl overflow-hidden${actions ? ' hover:bg-surface-container transition-colors group' : ''}`}>
      {/* Media thumbnail */}
      <div className="aspect-[4/3] relative overflow-hidden bg-surface-container">
        {firstThumb ? (
          <>
            <img
              src={firstThumb.url}
              alt=""
              className={`w-full h-full object-cover${actions ? ' opacity-80 group-hover:opacity-100 transition-opacity' : ''}`}
            />
            {ids && ids.length > 1 && actions && (
              <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">+{ids.length - 1}</span>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-on-surface-variant/20 text-xs uppercase tracking-wider">No media</span>
          </div>
        )}
      </div>
      {/* Card body */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg text-on-surface">
            {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unscheduled'}
          </span>
          {actions ? (
            <span className="text-xs text-on-surface-variant">
              {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          ) : (
            <StatusBadge status={post.status} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: post.platform_color ?? '#666' }} />
          <span className="text-xs text-on-surface-variant">{post.platform_name}</span>
          {actions && <StatusBadge status={post.status} />}
        </div>
        <p className="text-sm text-on-surface line-clamp-3">{post.caption || 'No caption'}</p>
        {actions && (
          <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/10">
            <button onClick={() => actions.onApprove(post.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-primary/20 text-primary transition-colors text-xs font-medium">
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
            <button onClick={() => actions.onEdit(post.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors text-xs font-medium">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={() => actions.onDelete(post.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-error/20 text-error transition-colors text-xs font-medium">
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
