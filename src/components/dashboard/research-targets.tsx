'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X as XIcon, Plus, Hash, Users } from 'lucide-react'

interface PlatformTargets {
  handles: string[]
  terms: string[]
  discoveredHandles: string[]
  discoveredTerms: string[]
}

interface ResearchTargetsProps {
  twitter: PlatformTargets
  instagram: PlatformTargets
  onAddTerm: (platform: string, term: string) => void
  onRemoveTerm: (platform: string, term: string) => void
  onAddHandle: (platform: string, handle: string) => void
  onRemoveHandle: (platform: string, handle: string) => void
}

function TargetList({
  label,
  icon: Icon,
  items,
  discoveredItems,
  placeholder,
  platform,
  onAdd,
  onRemove,
}: {
  label: string
  icon: typeof Users
  items: string[]
  discoveredItems: string[]
  placeholder: string
  platform: string
  onAdd: (platform: string, value: string) => void
  onRemove: (platform: string, value: string) => void
}) {
  const [value, setValue] = useState('')

  function submit() {
    if (!value.trim()) return
    onAdd(platform, label === 'Accounts' ? value.trim().replace(/^@/, '') : value.trim())
    setValue('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3 text-text-muted" />
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-[10px] text-text-muted bg-bg-base rounded-full px-1.5 py-0.5">{items.length}</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="flex-1 rounded-lg bg-bg-base border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent/60"
        />
        <Button size="sm" variant="outline" className="text-xs px-2" onClick={submit}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const isDiscovered = discoveredItems.includes(item)
          return (
            <span
              key={item}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                isDiscovered
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'bg-bg-base text-text-secondary border border-border'
              }`}
            >
              {label === 'Accounts' ? `@${item}` : item}
              <button onClick={() => onRemove(platform, item)} className="hover:text-status-failed">
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )
        })}
        {items.length === 0 && <span className="text-xs text-text-muted">None yet</span>}
      </div>
    </div>
  )
}

export function ResearchTargets({
  twitter, instagram, onAddTerm, onRemoveTerm, onAddHandle, onRemoveHandle,
}: ResearchTargetsProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-medium">Active Research Targets</h2>
        <p className="text-xs text-text-muted mt-0.5">Accounts and terms per platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Twitter */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#1DA1F2]" />
            <h3 className="text-sm font-medium">X / Twitter</h3>
          </div>
          <TargetList label="Accounts" icon={Users} items={twitter.handles} discoveredItems={twitter.discoveredHandles} placeholder="@handle" platform="twitter" onAdd={onAddHandle} onRemove={onRemoveHandle} />
          <TargetList label="Search Terms" icon={Hash} items={twitter.terms} discoveredItems={twitter.discoveredTerms} placeholder="hashtag or term" platform="twitter" onAdd={onAddTerm} onRemove={onRemoveTerm} />
        </div>

        {/* Instagram */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E1306C]" />
            <h3 className="text-sm font-medium">Instagram</h3>
          </div>
          <TargetList label="Accounts" icon={Users} items={instagram.handles} discoveredItems={instagram.discoveredHandles} placeholder="@handle" platform="instagram" onAdd={onAddHandle} onRemove={onRemoveHandle} />
          <TargetList label="Search Terms" icon={Hash} items={instagram.terms} discoveredItems={instagram.discoveredTerms} placeholder="hashtag or term" platform="instagram" onAdd={onAddTerm} onRemove={onRemoveTerm} />
        </div>
      </div>
    </div>
  )
}
