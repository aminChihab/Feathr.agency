// src/components/inbox/inbox-filters.tsx
'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InboxFiltersProps {
  status: string
  priority: string
  type: string
  platform: string
  search: string
  category: string
  platforms: { id: string; name: string; color: string }[]
  onStatusChange: (v: string) => void
  onPriorityChange: (v: string) => void
  onTypeChange: (v: string) => void
  onPlatformChange: (v: string) => void
  onSearchChange: (v: string) => void
  onCategoryChange: (v: string) => void
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'leads', label: 'Leads' },
  { value: 'clients', label: 'Clients' },
]

const PRIORITIES = [
  { value: 'all', label: 'All' },
  { value: 'hot', label: 'Hot', color: 'bg-priority-hot' },
  { value: 'warm', label: 'Warm', color: 'bg-priority-warm' },
  { value: 'cold', label: 'Cold', color: 'bg-priority-cold' },
]

export function InboxFilters({
  status, priority, type, platform, search, category, platforms,
  onStatusChange, onPriorityChange, onTypeChange, onPlatformChange, onSearchChange, onCategoryChange,
}: InboxFiltersProps) {
  return (
    <div className="space-y-3 p-3 border-b border-outline-variant/15">
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search conversations..."
        className="bg-surface-container-low h-8 text-xs text-on-surface placeholder:text-on-surface-variant/50"
      />

      <div className="flex gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => onCategoryChange(c.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] transition-colors',
              category === c.value
                ? 'bg-surface-container-high text-on-surface'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {PRIORITIES.map((p) => (
          <button
            key={p.value}
            onClick={() => onPriorityChange(p.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] transition-colors',
              priority === p.value
                ? 'bg-surface-container-high text-on-surface'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            )}
          >
            {p.color && <div className={cn('h-1.5 w-1.5 rounded-full', p.color)} />}
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="bg-surface-container-low h-7 text-[10px] flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="bg-surface-container-low h-7 text-[10px] flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="fan">Fan</SelectItem>
            <SelectItem value="returning_client">Returning</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={platform} onValueChange={onPlatformChange}>
          <SelectTrigger className="bg-surface-container-low h-7 text-[10px] flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
