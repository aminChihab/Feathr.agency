// src/components/inbox/inbox-filters.tsx
'use client'

import { cn } from '@/lib/utils'

interface InboxFiltersProps {
  category: string
  onCategoryChange: (v: string) => void
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'leads', label: 'Leads' },
  { value: 'clients', label: 'Clients' },
]

export function InboxFilters({ category, onCategoryChange }: InboxFiltersProps) {
  return (
    <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl flex-1 mr-2">
      {CATEGORIES.map((c) => (
        <button
          key={c.value}
          onClick={() => onCategoryChange(c.value)}
          className={cn(
            'flex-1 text-[10px] uppercase tracking-widest font-bold py-1.5 rounded-lg transition-colors',
            category === c.value
              ? 'bg-surface-container-high text-primary shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
