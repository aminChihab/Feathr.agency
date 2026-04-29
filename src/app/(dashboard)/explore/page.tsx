import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/explore-data'
import type { ExploreIdea } from '@/lib/explore-data'
import { ExploreClient } from './explore-client'
import signatureData from '@/lib/explore-signatures.json'

const CATEGORY_FILE_MAP: Record<string, string> = {
  'Lingerie': 'lingerie.jpg',
  'Lifestyle': 'lifestyle.jpg',
  'Promotional': 'promotional.jpg',
  'Behind the Scenes': 'behindthescenes.jpg',
  'Glam': 'glam.jpg',
  'Travel': 'travel.jpg',
  'Fitness': 'fitness.jpg',
  'Seasonal': 'seasonal.jpg',
}

const PLATFORMS = ['instagram', 'twitter', 'tiktok'] as const

async function fetchCoverUrls(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const urls: Record<string, string> = {}
  const paths = CATEGORIES.map(cat => `${userId}/category-covers/thumbs/${CATEGORY_FILE_MAP[cat]}`)
  const { data } = await supabase.storage.from('media').createSignedUrls(paths, 3600)
  if (data) {
    for (let i = 0; i < CATEGORIES.length; i++) {
      if (data[i]?.signedUrl) urls[CATEGORIES[i]] = data[i].signedUrl
    }
  }
  return urls
}

async function fetchIdeas(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ExploreIdea[]> {
  const paths = signatureData.map((s: { thumbPath: string }) => s.thumbPath)

  // Sign in batches of 100
  const allSigned: Record<string, string> = {}
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100)
    const { data } = await supabase.storage.from('media').createSignedUrls(batch, 3600)
    if (data) {
      for (let j = 0; j < batch.length; j++) {
        if (data[j]?.signedUrl) allSigned[batch[j]] = data[j].signedUrl
      }
    }
  }

  return signatureData.map((s: { id: string; thumbPath: string; category: string }, i: number) => ({
    id: s.id,
    imageUrl: allSigned[s.thumbPath] ?? '',
    caption: '',
    category: s.category,
    platform: PLATFORMS[i % PLATFORMS.length],
  })).filter(idea => idea.imageUrl)
}

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [coverUrls, ideas] = await Promise.all([
    fetchCoverUrls(supabase, user.id),
    fetchIdeas(supabase),
  ])

  return <ExploreClient coverUrls={coverUrls} ideas={ideas} />
}
