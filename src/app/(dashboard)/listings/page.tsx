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
  const [search, setSearch] = useState('')

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

  const filtered = listings.filter((l) => {
    if (!search) return true
    return l.platform_name.toLowerCase().includes(search.toLowerCase())
  })

  const totalViews = listings.reduce((sum, l) => sum + (l.performance.views ?? 0), 0)
  const totalClicks = listings.reduce((sum, l) => sum + (l.performance.clicks ?? 0), 0)
  const engagementRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0'
  const upcomingRenewals = listings.filter((l) => l.status === 'expiring').length
  const activeCount = listings.filter((l) => l.status === 'active').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Top App Bar */}
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-6">
          <h2 className="font-display text-3xl font-light text-primary">Listings</h2>
          <div className="h-6 w-[1px] bg-outline-variant/30" />
          <div className="flex items-center gap-1 text-sm text-on-surface-variant font-medium tracking-tight">
            <span className="material-symbols-outlined text-sm">language</span>
            Active Sites: {activeCount}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40">search</span>
            <input
              className="bg-surface-container-low border-none focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-4 py-2 text-sm w-64 transition-all"
              placeholder="Search directories..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Create Campaign
          </button>
        </div>
      </header>

      {/* Quick Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10 flex justify-between items-end">
          <div>
            <p className="text-xs uppercase tracking-widest text-on-surface-variant/60 mb-2">Total Monthly Views</p>
            <h3 className="font-display text-4xl text-on-surface">
              {totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews}
            </h3>
          </div>
          <div className="text-tertiary flex items-center text-xs font-medium bg-tertiary/10 px-2 py-1 rounded-full">
            <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
            +14%
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10 flex justify-between items-end">
          <div>
            <p className="text-xs uppercase tracking-widest text-on-surface-variant/60 mb-2">Engagement Rate</p>
            <h3 className="font-display text-4xl text-on-surface">{engagementRate}%</h3>
          </div>
          <div className="text-tertiary flex items-center text-xs font-medium bg-tertiary/10 px-2 py-1 rounded-full">
            <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
            +2.1%
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10 flex justify-between items-end">
          <div>
            <p className="text-xs uppercase tracking-widest text-on-surface-variant/60 mb-2">Upcoming Renewals</p>
            <h3 className="font-display text-4xl text-on-surface">{upcomingRenewals}</h3>
          </div>
          <div className="text-secondary flex items-center text-xs font-medium bg-secondary/10 px-2 py-1 rounded-full">
            <span className="material-symbols-outlined text-sm mr-1">schedule</span>
            {upcomingRenewals > 0 ? 'Urgent' : 'Clear'}
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      {filtered.length === 0 && !search ? (
        <div className="bg-surface-container-low rounded-xl p-6 text-center text-on-surface-variant">
          <p>No directory listings yet. Listings will appear here when your directories are connected.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((listing) => (
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

          {/* Add New Card */}
          <div className="border-2 border-dashed border-outline-variant/20 hover:border-primary/40 transition-all duration-300 rounded-xl flex flex-col items-center justify-center text-center p-10 group cursor-pointer h-full min-h-[400px]">
            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant group-hover:text-primary transition-colors">add</span>
            </div>
            <h5 className="font-display text-xl mb-1">New Directory</h5>
            <p className="text-sm text-on-surface-variant/60">Connect your account to track metrics</p>
          </div>
        </div>
      )}

      {/* Market Presence Footer */}
      <div className="mt-20 flex flex-col md:flex-row gap-12 items-start opacity-70 hover:opacity-100 transition-opacity">
        <div className="max-w-md">
          <h5 className="font-display text-2xl mb-4">Market Presence</h5>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Your listings are currently reaching an estimated <span className="text-primary font-medium">
            {totalViews > 0 ? `${Math.round(totalViews * 35).toLocaleString()} monthly active users` : 'users'}
            </span> across all platforms. Maintain 100% profile completeness on high-traffic sites to maximize ROI.
          </p>
        </div>
        <div className="flex-1 w-full backdrop-blur-xl bg-[rgba(42,42,42,0.4)] p-8 rounded-2xl border border-outline-variant/10">
          <div className="flex items-center justify-between mb-8">
            <h6 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Traffic Source Distribution</h6>
            <span className="material-symbols-outlined text-on-surface-variant">info</span>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span>Organic Search</span>
                <span>65%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[65%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span>Direct Referrals</span>
                <span>24%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                <div className="bg-[#FEBBCB]/40 h-full w-[24%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span>Social Backlinks</span>
                <span>11%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                <div className="bg-tertiary/40 h-full w-[11%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
