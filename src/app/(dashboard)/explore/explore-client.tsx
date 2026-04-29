'use client'

import { useState, useMemo } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { CategoryCarousel } from '@/components/explore/category-carousel'
import { ExploreSidebar, MobileFilterSheet } from '@/components/explore/explore-sidebar'
import { ExploreGrid } from '@/components/explore/explore-grid'
import {
  PLACEHOLDER_TRENDING,
  type Category,
  type ExploreIdea,
  type TrendingPost,
} from '@/lib/explore-data'

interface ExploreClientProps {
  coverUrls: Record<string, string>
  ideas: ExploreIdea[]
}

export function ExploreClient({ coverUrls, ideas }: ExploreClientProps) {
  const [activeTab, setActiveTab] = useState<'ideas' | 'trending'>('ideas')
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const filteredIdeas = useMemo(() => {
    let items = ideas
    if (activeCategory) {
      items = items.filter((i) => i.category === activeCategory)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter((i) => i.caption.toLowerCase().includes(q))
    }
    return items
  }, [activeCategory, searchQuery])

  const filteredTrending = useMemo(() => {
    let items = PLACEHOLDER_TRENDING
    if (activeCategory) {
      items = items.filter((i) => i.category === activeCategory)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter((i) => i.text.toLowerCase().includes(q))
    }
    return items
  }, [activeCategory, searchQuery])

  const resultCount = activeTab === 'ideas' ? filteredIdeas.length : filteredTrending.length

  function handleIdeaClick(idea: ExploreIdea) {
    console.log('Idea clicked:', idea.id)
  }

  function handleTrendingClick(post: TrendingPost) {
    console.log('Trending clicked:', post.id)
  }

  return (
    <div>
      <PageHeader title="Explore" subtitle="Browse ideas and trending content" />

      <CategoryCarousel
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
        coverUrls={coverUrls}
      />

      {/* Mobile: toggle + filter button */}
      <div className="flex items-center justify-between px-4 mt-6 md:hidden">
        <div className="flex bg-surface-container-low rounded-full p-1">
          <button
            onClick={() => setActiveTab('ideas')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'ideas' ? 'bg-surface-container-high text-white' : 'text-on-surface-variant/50'
            }`}
          >
            Ideas
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'trending' ? 'bg-surface-container-high text-white' : 'text-on-surface-variant/50'
            }`}
          >
            Trending
          </button>
        </div>
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-white transition-colors"
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>
      </div>

      {/* Main content area: sidebar + grid */}
      <div className="flex gap-4 md:gap-8 px-4 md:px-10 mt-6 pb-10">
        <ExploreSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          resultCount={resultCount}
        />

        <div className="flex-1 min-w-0">
          <div className="hidden md:flex items-center justify-between mb-4">
            <p className="text-sm text-on-surface-variant">
              {resultCount} {activeTab === 'ideas' ? 'ideas to explore' : 'trending posts'}
            </p>
          </div>

          <ExploreGrid
            activeTab={activeTab}
            ideas={filteredIdeas}
            trending={filteredTrending}
            onIdeaClick={handleIdeaClick}
            onTrendingClick={handleTrendingClick}
          />
        </div>
      </div>

      <MobileFilterSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </div>
  )
}
