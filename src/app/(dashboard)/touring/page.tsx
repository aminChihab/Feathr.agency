import { MapPin } from 'lucide-react'

export default function TouringPage() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center h-20 px-10 shadow-2xl shadow-black/40">
        <h2 className="font-display text-3xl font-light text-primary">Touring</h2>
      </header>

      <div className="p-10 space-y-6">
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
    </>
  )
}
