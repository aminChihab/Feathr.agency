import NextImage from 'next/image'
import { CATEGORIES, type Category } from '@/lib/explore-data'

interface CategoryCarouselProps {
  activeCategory: Category | null
  onSelect: (category: Category | null) => void
  coverUrls?: Record<string, string>
}

export function CategoryCarousel({ activeCategory, onSelect, coverUrls = {} }: CategoryCarouselProps) {
  return (
    <div className="px-4 md:px-10">
      <p className="text-sm font-medium text-on-surface-variant mb-3">
        {CATEGORIES.length}+ categories to explore
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 stagger-children">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat
          const coverUrl = coverUrls[cat]
          return (
            <button
              key={cat}
              onClick={() => onSelect(isActive ? null : cat)}
              className={`shrink-0 relative w-36 h-48 rounded-xl overflow-hidden glow-card shine-border ${
                isActive ? 'ring-2 ring-primary scale-[1.02] shadow-[0_0_20px_rgba(182,133,255,0.2)]' : ''
              }`}
            >
              {coverUrl ? (
                <NextImage
                  src={coverUrl}
                  alt={cat}
                  fill
                  sizes="144px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-surface-container-high" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute bottom-3 left-0 right-0 text-center text-sm font-medium text-white drop-shadow-lg">
                {cat}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
