// src/components/explore/trending-card.tsx
import { Heart, MessageCircle, Repeat2 } from 'lucide-react'
import type { TrendingPost } from '@/lib/explore-data'

interface TrendingCardProps {
  post: TrendingPost
  onClick: (post: TrendingPost) => void
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export function TrendingCard({ post, onClick }: TrendingCardProps) {
  return (
    <button
      onClick={() => onClick(post)}
      className="w-full text-left rounded-xl bg-surface-container-low p-4 break-inside-avoid mb-2 hover:bg-surface-container transition-colors glow-card shimmer-border group"
    >
      <p className="text-sm text-white line-clamp-3 mb-3">{post.text}</p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-on-surface-variant/50">{post.authorHandle}</span>
        <span className="text-xs text-on-surface-variant/30">·</span>
        <span className="text-xs text-on-surface-variant/50 capitalize">{post.platform}</span>
      </div>
      <div className="flex items-center gap-4 text-on-surface-variant/40 group-hover:text-primary/60 transition-colors duration-300">
        <span className="flex items-center gap-1 text-xs">
          <Heart size={12} />
          {formatCount(post.likes)}
        </span>
        <span className="flex items-center gap-1 text-xs">
          <MessageCircle size={12} />
          {formatCount(post.replies)}
        </span>
        <span className="flex items-center gap-1 text-xs">
          <Repeat2 size={12} />
          {formatCount(post.reposts)}
        </span>
      </div>
    </button>
  )
}
