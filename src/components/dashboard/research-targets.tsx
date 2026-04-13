'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Plus, Hash, Users } from 'lucide-react'

interface ResearchTargetsProps {
  terms: string[]
  handles: string[]
  discoveredTerms: string[]
  discoveredHandles: string[]
  onAddTerm: (term: string) => void
  onRemoveTerm: (term: string) => void
  onAddHandle: (handle: string) => void
  onRemoveHandle: (handle: string) => void
}

export function ResearchTargets({
  terms, handles, discoveredTerms, discoveredHandles,
  onAddTerm, onRemoveTerm, onAddHandle, onRemoveHandle,
}: ResearchTargetsProps) {
  const [newTerm, setNewTerm] = useState('')
  const [newHandle, setNewHandle] = useState('')

  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-medium">Active Research Targets</h2>
        <p className="text-xs text-text-muted mt-0.5">Accounts and terms your AI strategists monitor</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Accounts */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-text-muted" />
            <h3 className="text-sm font-medium">Accounts</h3>
            <span className="text-[10px] text-text-muted bg-bg-base rounded-full px-2 py-0.5">{handles.length}</span>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="@handle" value={newHandle} onChange={(e) => setNewHandle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newHandle.trim()) { onAddHandle(newHandle.trim().replace(/^@/, '')); setNewHandle('') } }}
              className="flex-1 rounded-lg bg-bg-base border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent/60" />
            <Button size="sm" variant="outline" className="text-xs"
              onClick={() => { if (newHandle.trim()) { onAddHandle(newHandle.trim().replace(/^@/, '')); setNewHandle('') } }}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {handles.map((handle) => {
              const isDiscovered = discoveredHandles.includes(handle)
              return (
                <span key={handle} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                  isDiscovered ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-bg-base text-text-secondary border border-border'
                }`}>
                  @{handle}
                  <button onClick={() => onRemoveHandle(handle)} className="hover:text-status-failed"><X className="h-3 w-3" /></button>
                </span>
              )
            })}
          </div>
        </div>
        {/* Terms */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-text-muted" />
            <h3 className="text-sm font-medium">Search Terms</h3>
            <span className="text-[10px] text-text-muted bg-bg-base rounded-full px-2 py-0.5">{terms.length}</span>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="hashtag or search term" value={newTerm} onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newTerm.trim()) { onAddTerm(newTerm.trim()); setNewTerm('') } }}
              className="flex-1 rounded-lg bg-bg-base border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent/60" />
            <Button size="sm" variant="outline" className="text-xs"
              onClick={() => { if (newTerm.trim()) { onAddTerm(newTerm.trim()); setNewTerm('') } }}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {terms.map((term) => {
              const isDiscovered = discoveredTerms.includes(term)
              return (
                <span key={term} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                  isDiscovered ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-bg-base text-text-secondary border border-border'
                }`}>
                  {term}
                  <button onClick={() => onRemoveTerm(term)} className="hover:text-status-failed"><X className="h-3 w-3" /></button>
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
