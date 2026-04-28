// src/components/explore/category-carousel.tsx
import { CATEGORIES, type Category } from '@/lib/explore-data'

interface CategoryCarouselProps {
  activeCategory: Category | null
  onSelect: (category: Category | null) => void
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Lingerie': 'from-pink-900/80 to-purple-900/80',
  'Lifestyle': 'from-amber-900/80 to-orange-900/80',
  'Promotional': 'from-emerald-900/80 to-teal-900/80',
  'Behind the Scenes': 'from-slate-800/80 to-zinc-900/80',
  'Glam': 'from-rose-900/80 to-red-900/80',
  'Travel': 'from-sky-900/80 to-blue-900/80',
  'Fitness': 'from-lime-900/80 to-green-900/80',
  'Seasonal': 'from-violet-900/80 to-indigo-900/80',
}

export function CategoryCarousel({ activeCategory, onSelect }: CategoryCarouselProps) {
  return (
    <div className="px-6 md:px-10">
      <p className="text-sm font-medium text-on-surface-variant mb-3">
        {CATEGORIES.length}+ categories to explore
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 stagger-children">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat
          const gradient = CATEGORY_GRADIENTS[cat] ?? 'from-gray-800/80 to-gray-900/80'
          return (
            <button
              key={cat}
              onClick={() => onSelect(isActive ? null : cat)}
              className={`shrink-0 relative w-36 h-48 rounded-xl overflow-hidden transition-all glow-card shimmer-border ${
                isActive ? 'ring-2 ring-primary scale-[1.02] shadow-[0_0_20px_rgba(182,133,255,0.2)]' : 'hover:scale-[1.01]'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-3 left-0 right-0 text-center text-sm font-medium text-white">
                {cat}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
