// src/components/explore/explore-grid.tsx
import { IdeaCard } from './idea-card'
import { TrendingCard } from './trending-card'
import type { ExploreIdea, TrendingPost } from '@/lib/explore-data'

interface ExploreGridProps {
  activeTab: 'ideas' | 'trending'
  ideas: ExploreIdea[]
  trending: TrendingPost[]
  onIdeaClick: (idea: ExploreIdea) => void
  onTrendingClick: (post: TrendingPost) => void
}

export function ExploreGrid({ activeTab, ideas, trending, onIdeaClick, onTrendingClick }: ExploreGridProps) {
  if (activeTab === 'ideas') {
    if (ideas.length === 0) {
      return (
        <div className="py-16 text-center">
          <p className="text-sm text-on-surface-variant/40">No ideas found. Try a different filter.</p>
        </div>
      )
    }
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-2">
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onClick={onIdeaClick} />
        ))}
      </div>
    )
  }

  if (trending.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-on-surface-variant/40">No trending posts found. Try a different filter.</p>
      </div>
    )
  }
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-2">
      {trending.map((post) => (
        <TrendingCard key={post.id} post={post} onClick={onTrendingClick} />
      ))}
    </div>
  )
}
