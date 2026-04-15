import { Sparkles } from 'lucide-react'

export default function StudioPage() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center h-20 px-6">
        <h2 className="font-display text-3xl font-light text-primary">Studio</h2>
      </header>

      <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
          <Sparkles className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="font-display text-2xl text-on-surface mb-2">Your Creative Workspace</h3>
        <p className="text-sm text-on-surface-variant max-w-sm">
          This is where AI will help you create images, video concepts, and manage your media library. Coming soon.
        </p>
      </div>
    </>
  )
}
