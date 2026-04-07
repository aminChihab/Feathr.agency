// src/components/dashboard/post-card.tsx
'use client'

import { StatusBadge } from './status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PostCardProps {
  post: {
    id: string
    caption: string | null
    status: string
    scheduled_at: string | null
    post_url: string | null
    platform_name: string
    platform_color: string
  }
  onApprove: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onRetry: (id: string) => void
}

export function PostCard({ post, onApprove, onEdit, onDelete, onRetry }: PostCardProps) {
  const time = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'Not scheduled'

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: post.platform_color }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{post.caption || 'No caption'}</p>
          <p className="text-xs text-text-muted">{post.platform_name} · {time}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <StatusBadge status={post.status} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">···</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {post.status === 'draft' && (
              <DropdownMenuItem onClick={() => onApprove(post.id)}>Approve</DropdownMenuItem>
            )}
            {['draft', 'approved', 'failed'].includes(post.status) && (
              <DropdownMenuItem onClick={() => onEdit(post.id)}>Edit</DropdownMenuItem>
            )}
            {post.status === 'failed' && (
              <DropdownMenuItem onClick={() => onRetry(post.id)}>Retry</DropdownMenuItem>
            )}
            {post.status === 'posted' && post.post_url && (
              <DropdownMenuItem asChild>
                <a href={post.post_url} target="_blank" rel="noopener noreferrer">View on platform</a>
              </DropdownMenuItem>
            )}
            {['approved', 'scheduled'].includes(post.status) && (
              <DropdownMenuItem onClick={() => onApprove(post.id)}>Cancel</DropdownMenuItem>
            )}
            {['draft', 'failed'].includes(post.status) && (
              <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-status-failed">Delete</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
