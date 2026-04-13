// src/components/dashboard/post-card.tsx
'use client'

import { Check, Edit3, X } from 'lucide-react'

interface MediaThumb {
  id: string
  url: string
  file_type: string
}

interface PostCardProps {
  post: {
    id: string
    caption: string | null
    status: string
    scheduled_at: string | null
    post_url: string | null
    platform_name: string
    platform_color: string
    media_ids: unknown
  }
  mediaThumbs?: Record<string, MediaThumb>
  onApprove: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onRetry: (id: string) => void
}

/** Extract hashtags from caption text. */
function splitCaptionAndTags(caption: string): { text: string; tags: string[] } {
  const tagRegex = /#[\w]+/g
  const tags = caption.match(tagRegex) ?? []
  const text = caption.replace(tagRegex, '').trim()
  return { text, tags }
}

export function PostCard({ post, mediaThumbs = {}, onApprove, onEdit, onDelete }: PostCardProps) {
  const time = post.scheduled_at
    ? `Scheduled for ${new Date(post.scheduled_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : 'Not scheduled'

  const mediaIds = (post.media_ids as string[]) ?? []
  const firstThumb = mediaIds.length > 0 ? mediaThumbs[mediaIds[0]] : null
  const hasImage = !!firstThumb

  const { text: captionText, tags: hashtags } = post.caption
    ? splitCaptionAndTags(post.caption)
    : { text: 'No caption', tags: [] }

  // Full-width editorial card matching the Stitch mockup
  if (hasImage) {
    return (
      <article className="group bg-surface-container-low rounded-2xl overflow-hidden hover:bg-surface-container transition-colors duration-300 flex flex-col md:flex-row border border-transparent hover:border-outline-variant/10">
        {/* Image thumbnail */}
        <div className="md:w-72 h-72 relative flex-shrink-0">
          <img
            alt={post.platform_name}
            className="w-full h-full object-cover"
            src={firstThumb!.url}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <span className="text-[10px] text-white/80 font-medium uppercase tracking-widest">
              Reviewing visual assets
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 flex flex-col">
          {/* Platform chip + Draft badge + schedule time */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full border border-outline-variant/10">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: post.platform_color }}
                />
                <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface">
                  {post.platform_name}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter bg-surface-container-highest px-3 py-1 rounded-full text-on-surface-variant/70">
                {post.status === 'draft' ? 'Draft' : post.status.charAt(0).toUpperCase() + post.status.slice(1)}
              </span>
            </div>
            <time className="text-[11px] text-on-surface-variant/40 font-medium">{time}</time>
          </div>

          {/* Caption text */}
          <div className="flex-1">
            <p className="text-on-surface text-lg leading-relaxed mb-4 whitespace-pre-wrap break-words">
              {captionText}
              {hashtags.length > 0 && (
                <>
                  {' '}
                  <span className="text-primary/70">{hashtags.join(' ')}</span>
                </>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-auto pt-6">
            <div className="flex items-center gap-4">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-full text-xs font-semibold"
                onClick={() => onApprove(post.id)}
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-all"
                onClick={() => onEdit(post.id)}
              >
                <Edit3 className="h-5 w-5" />
              </button>
              <button
                className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-all"
                onClick={() => onDelete(post.id)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Assignee dots (decorative) */}
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-surface-container-low bg-surface-container-highest" />
              <div className="w-6 h-6 rounded-full border-2 border-surface-container-low bg-surface-container-highest" />
            </div>
          </div>
        </div>
      </article>
    )
  }

  // Text-only card (no image) -- LinkedIn-style from mockup
  return (
    <article className="group bg-surface-container-low rounded-2xl overflow-hidden hover:bg-surface-container transition-colors duration-300 border border-transparent hover:border-outline-variant/10">
      <div className="p-8 flex flex-col">
        {/* Platform chip + Draft badge + schedule time */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full border border-outline-variant/10">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: post.platform_color }}
              />
              <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface">
                {post.platform_name}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter bg-surface-container-highest px-3 py-1 rounded-full text-on-surface-variant/70">
              {post.status === 'draft' ? 'Draft' : post.status.charAt(0).toUpperCase() + post.status.slice(1)}
            </span>
          </div>
          <time className="text-[11px] text-on-surface-variant/40 font-medium">{time}</time>
        </div>

        {/* Caption text */}
        <div className="flex-1 max-w-3xl">
          <p className="text-on-surface-variant text-base leading-relaxed mb-6 whitespace-pre-wrap break-words">
            {captionText}
          </p>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-outline-variant/5">
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-full text-xs font-semibold"
              onClick={() => onApprove(post.id)}
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-all"
              onClick={() => onEdit(post.id)}
            >
              <Edit3 className="h-5 w-5" />
            </button>
            <button
              className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-all"
              onClick={() => onDelete(post.id)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
