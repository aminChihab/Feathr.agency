'use client'

import { useState } from 'react'
import { StudioTemplates, type VideoTemplate } from './studio-templates'
import { StudioBrief } from './studio-brief'
import { StudioEditor } from './studio-editor'

interface StudioWorkspaceProps {
  userId: string
}

export function StudioWorkspace({ userId }: StudioWorkspaceProps) {
  const [screen, setScreen] = useState<'templates' | 'brief' | 'editor'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null)

  function handleSelectTemplate(template: VideoTemplate) {
    setSelectedTemplate(template)
    setScreen('brief')
  }

  function handleStartEditing() {
    setScreen('editor')
  }

  function handleSave() {
    // Reset to templates after saving
    setScreen('templates')
    setSelectedTemplate(null)
    // TODO B3: actual save logic — create content_calendar draft
    alert('Draft created! Check your Drafts tab to add a caption and schedule.')
  }

  if (screen === 'brief' && selectedTemplate) {
    return (
      <StudioBrief
        template={selectedTemplate}
        onBack={() => setScreen('templates')}
        onStartEditing={handleStartEditing}
      />
    )
  }

  if (screen === 'editor' && selectedTemplate) {
    return (
      <StudioEditor
        template={selectedTemplate}
        onBack={() => setScreen('brief')}
        onSave={handleSave}
      />
    )
  }

  return <StudioTemplates onSelectTemplate={handleSelectTemplate} />
}
