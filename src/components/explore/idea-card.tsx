// src/components/explore/idea-card.tsx
import type { ExploreIdea } from '@/lib/explore-data'

interface IdeaCardProps {
  idea: ExploreIdea
  onClick: (idea: ExploreIdea) => void
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  tiktok: '#000000',
}

export function IdeaCard({ idea, onClick }: IdeaCardProps) {
  return (
    <button
      onClick={() => onClick(idea)}
      className="w-full text-left rounded-xl overflow-hidden break-inside-avoid mb-2 group"
    >
      <div className="relative">
        <img
          src={idea.imageUrl}
          alt=""
          className="w-full object-cover rounded-xl group-hover:opacity-90 transition-opacity"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: PLATFORM_COLORS[idea.platform] ?? '#666' }}
          />
          <span className="text-[11px] text-white/70 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {idea.category}
          </span>
        </div>
      </div>
    </button>
  )
}
