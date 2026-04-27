'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'
import { CATEGORIES, type Category } from '@/lib/explore-data'

interface ExploreSidebarProps {
  activeTab: 'ideas' | 'trending'
  onTabChange: (tab: 'ideas' | 'trending') => void
  activeCategory: Category | null
  onCategoryChange: (category: Category | null) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  resultCount: number
}

export function ExploreSidebar({
  activeTab, onTabChange, activeCategory, onCategoryChange,
  searchQuery, onSearchChange, resultCount,
}: ExploreSidebarProps) {
  return (
    <aside className="hidden md:block w-60 shrink-0 space-y-6">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search ideas..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-surface-container-low border-none rounded-full px-4 py-2.5 pl-10 text-sm text-white placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/30 outline-none"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/40" />
      </div>

      {/* Select button (disabled for now) */}
      <button
        disabled
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-outline-variant/20 text-sm text-on-surface-variant/30 cursor-not-allowed"
      >
        <SlidersHorizontal size={14} />
        Select
      </button>

      {/* Ideas / Trending toggle */}
      <div className="flex bg-surface-container-low rounded-full p-1">
        <button
          onClick={() => onTabChange('ideas')}
          className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'ideas' ? 'bg-surface-container-high text-white' : 'text-on-surface-variant/50'
          }`}
        >
          Ideas
        </button>
        <button
          onClick={() => onTabChange('trending')}
          className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'trending' ? 'bg-surface-container-high text-white' : 'text-on-surface-variant/50'
          }`}
        >
          Trending
        </button>
      </div>

      {/* Count */}
      <p className="text-sm font-medium text-white">
        {resultCount} {activeTab === 'ideas' ? 'ideas to explore' : 'trending posts'}
      </p>

      {/* Filter by */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-on-surface-variant/50 uppercase tracking-wider mb-2">
          Filter by
        </p>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(activeCategory === cat ? null : cat)}
            className={`block w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
              activeCategory === cat
                ? 'text-white font-medium'
                : 'text-on-surface-variant/50 hover:text-on-surface-variant'
            }`}
          >
            {cat}
          </button>
        ))}
        {activeCategory && (
          <button
            onClick={() => onCategoryChange(null)}
            className="flex items-center gap-1 text-xs text-primary mt-2 hover:opacity-70"
          >
            Reset <X size={12} />
          </button>
        )}
      </div>
    </aside>
  )
}

// Mobile filter sheet
interface MobileFilterSheetProps {
  open: boolean
  onClose: () => void
  activeTab: 'ideas' | 'trending'
  onTabChange: (tab: 'ideas' | 'trending') => void
  activeCategory: Category | null
  onCategoryChange: (category: Category | null) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function MobileFilterSheet({
  open, onClose, activeTab, onTabChange,
  activeCategory, onCategoryChange, searchQuery, onSearchChange,
}: MobileFilterSheetProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-high rounded-t-2xl p-6 space-y-5 md:hidden max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Filters</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-full px-4 py-2.5 pl-10 text-sm text-white placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/30 outline-none"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/40" />
        </div>

        {/* Toggle */}
        <div className="flex bg-surface-container-low rounded-full p-1">
          <button
            onClick={() => onTabChange('ideas')}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'ideas' ? 'bg-surface-container-high text-white' : 'text-on-surface-variant/50'
            }`}
          >
            Ideas
          </button>
          <button
            onClick={() => onTabChange('trending')}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'trending' ? 'bg-surface-container-high text-white' : 'text-on-surface-variant/50'
            }`}
          >
            Trending
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-on-surface-variant/50 uppercase tracking-wider mb-2">
            Filter by
          </p>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { onCategoryChange(activeCategory === cat ? null : cat); onClose() }}
              className={`block w-full text-left px-2 py-2 rounded-lg text-sm transition-colors ${
                activeCategory === cat
                  ? 'text-white font-medium bg-surface-container-highest'
                  : 'text-on-surface-variant/50 hover:text-on-surface-variant'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
