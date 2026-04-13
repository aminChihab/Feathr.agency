import { MapPin } from 'lucide-react'

export default function TouringPage() {
  return (
    <div className="space-y-6">
      {/* Top bar */}
      <h1 className="font-display text-3xl text-primary">Touring</h1>

      {/* Empty state */}
      <div className="flex items-center justify-center py-20">
        <div className="bg-surface-container-low rounded-2xl p-12 border border-outline-variant/10 text-center max-w-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-display text-xl text-on-surface">Plan your next tour</h2>
          <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
            Touring lets you coordinate city visits, schedule content around travel dates, and notify your audience automatically. This feature is coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
