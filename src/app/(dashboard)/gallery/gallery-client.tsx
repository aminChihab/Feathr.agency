'use client'

import { MediaLibrary } from '@/components/studio/media-library'
import type { SignedMediaItem } from '@/lib/storage'

interface GalleryClientProps {
  userId: string
  initialItems: SignedMediaItem[]
  initialCursor: string | null
  totalCount: number
  creditBalance: number | null
}

export function GalleryClient({
  userId,
  initialItems,
  initialCursor,
  totalCount,
  creditBalance,
}: GalleryClientProps) {
  return (
    <MediaLibrary
      userId={userId}
      initialItems={initialItems}
      initialCursor={initialCursor}
      totalCount={totalCount}
      creditBalance={creditBalance}
    />
  )
}
