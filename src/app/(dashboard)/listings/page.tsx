// src/app/(dashboard)/listings/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ListingCard } from '@/components/dashboard/listing-card'

interface ListingData {
  id: string
  listing_url: string | null
  status: string
  expires_at: string | null
  renewal_status: string
  performance: { views?: number; clicks?: number }
  platform_name: string
  platform_color: string
}

export default function ListingsPage() {
  const supabase = createClient()
  const [listings, setListings] = useState<ListingData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('listings')
        .select('*, platform_accounts(platforms(name, color))')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })

      setListings(
        (data ?? []).map((item: any) => ({
          id: item.id,
          listing_url: item.listing_url,
          status: item.status,
          expires_at: item.expires_at,
          renewal_status: item.renewal_status,
          performance: (item.performance as { views?: number; clicks?: number }) ?? {},
          platform_name: item.platform_accounts?.platforms?.name ?? 'Unknown',
          platform_color: item.platform_accounts?.platforms?.color ?? '#666',
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Listings</h1>

      {listings.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-6 text-center text-on-surface-variant">
          <p>No directory listings yet. Listings will appear here when your directories are connected.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              platformName={listing.platform_name}
              platformColor={listing.platform_color}
              listingUrl={listing.listing_url}
              status={listing.status}
              expiresAt={listing.expires_at}
              renewalStatus={listing.renewal_status}
              performance={listing.performance}
            />
          ))}
        </div>
      )}
    </div>
  )
}
