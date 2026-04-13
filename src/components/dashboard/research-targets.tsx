'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X as XIcon, Plus, Hash, Users, TrendingUp, Minus, Sparkles, Leaf, Palette } from 'lucide-react'

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
        <Icon className="h-3 w-3 text-on-surface-variant/60" />
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-semibold">{label}</span>
        <span className="text-[10px] text-on-surface-variant/60 bg-surface-container-highest rounded-full px-1.5 py-0.5">{items.length}</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="flex-1 rounded-lg bg-surface-container border-none px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
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
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                isDiscovered
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {label === 'Accounts' ? `@${item}` : item}
              <button onClick={() => onRemove(platform, item)} className="hover:text-status-failed">
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )
        })}
        {items.length === 0 && <span className="text-xs text-on-surface-variant/60">None yet</span>}
      </div>
    </div>
  )
}

export function ResearchTargets({
  twitter, instagram, onAddTerm, onRemoveTerm, onAddHandle, onRemoveHandle,
}: ResearchTargetsProps) {
  // Combine all handles into competitor rows for the mockup layout
  const allHandles = [
    ...twitter.handles.map((h) => ({ name: h, platform: 'twitter', color: '#1DA1F2' })),
    ...instagram.handles.map((h) => ({ name: h, platform: 'instagram', color: '#E1306C' })),
  ]
  // Combine all terms into hashtag chips
  const allTerms = [
    ...twitter.terms.map((t) => ({ term: t, platform: 'twitter' })),
    ...instagram.terms.map((t) => ({ term: t, platform: 'instagram' })),
  ]

  return (
    <div className="space-y-6">
      {/* Active Targets panel */}
      <div className="bg-surface-container-low p-8 rounded-xl space-y-8">
        <div>
          <h3 className="font-display text-2xl mb-6">Active Targets</h3>

          {/* Primary Competitors */}
          <div className="space-y-4">
            <p className="text-[10px] tracking-widest text-on-surface-variant/50 font-semibold uppercase">Primary Competitors</p>
            <div className="space-y-2">
              {allHandles.length === 0 && (
                <p className="text-xs text-on-surface-variant/60 py-2">No competitors tracked yet</p>
              )}
              {allHandles.map((handle) => (
                <div
                  key={`${handle.platform}-${handle.name}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-container-highest/30 hover:bg-surface-container-highest transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${handle.color}15`, color: handle.color }}
                    >
                      {handle.platform === 'twitter' ? (
                        <Leaf className="h-4 w-4" />
                      ) : (
                        <Palette className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium">@{handle.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary/40 group-hover:text-primary transition-colors" />
                    <button
                      onClick={() => onRemoveHandle(handle.platform, handle.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant/40 hover:text-status-failed"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add handle inline */}
            <AddInline
              placeholder="@handle"
              onAdd={(val) => {
                const cleaned = val.replace(/^@/, '')
                // Default to twitter if no platform context
                onAddHandle('twitter', cleaned)
              }}
            />
          </div>

          {/* Hashtag Tracking */}
          <div className="space-y-4 mt-8">
            <p className="text-[10px] tracking-widest text-on-surface-variant/50 font-semibold uppercase">Hashtag Tracking</p>
            <div className="flex flex-wrap gap-2">
              {allTerms.length === 0 && (
                <span className="text-xs text-on-surface-variant/60">No hashtags tracked yet</span>
              )}
              {allTerms.map((t) => (
                <span
                  key={`${t.platform}-${t.term}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-highest text-on-surface-variant text-[11px] rounded-full border border-outline-variant/10"
                >
                  #{t.term}
                  <button
                    onClick={() => onRemoveTerm(t.platform, t.term)}
                    className="hover:text-status-failed"
                  >
                    <XIcon className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add term inline */}
            <AddInline
              placeholder="hashtag or term"
              onAdd={(val) => {
                onAddTerm('twitter', val)
              }}
            />
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant/10">
          <button className="w-full py-3 text-xs font-semibold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors uppercase tracking-widest">
            Manage Targets
          </button>
        </div>
      </div>

      {/* Market Sentiment card */}
      <div className="bg-surface-container-high p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h4 className="font-medium text-sm">Market Sentiment</h4>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
          Competitors are shifting towards high-fidelity motion graphics and serif-heavy identities. Market engagement is currently peaking in &ldquo;Process Revelation&rdquo; content.
        </p>
        <div className="h-1 bg-surface-container w-full rounded-full overflow-hidden">
          <div className="h-full bg-primary w-[72%]" />
        </div>
        <p className="text-[10px] text-on-surface-variant/60 mt-2 uppercase tracking-tight">
          Relative Opportunity Score: 72/100
        </p>
      </div>
    </div>
  )
}

/** Small inline add input for competitor handles / terms */
function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)

  function submit() {
    if (!value.trim()) return
    onAdd(value.trim())
    setValue('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/50 hover:text-primary transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add
      </button>
    )
  }

  return (
    <div className="flex gap-2 mt-1">
      <input
        type="text"
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setOpen(false); setValue('') }
        }}
        className="flex-1 rounded-lg bg-surface-container border-none px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
      />
      <button onClick={submit} className="text-xs text-primary hover:text-primary/80">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
