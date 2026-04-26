import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export default function ExplorePage() {
  return (
    <div>
      <PageHeader
        title="Explore"
        subtitle="Browse ideas and create AI content"
      />
      <div className="px-4 md:px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
          <Sparkles className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="font-display text-2xl text-on-surface mb-2">Your Creative Workspace</h3>
        <p className="text-sm text-on-surface-variant max-w-sm">
          This is where AI will help you create images, video concepts, and manage your media library. Coming soon.
        </p>
      </div>
    </div>
  )
}
