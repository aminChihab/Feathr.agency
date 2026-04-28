import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/explore-data'
import { ExploreClient } from './explore-client'

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

async function fetchCoverUrls(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const urls: Record<string, string> = {}

  const paths = CATEGORIES.map(cat => `${userId}/category-covers/${CATEGORY_FILE_MAP[cat]}`)
  const { data } = await supabase.storage.from('media').createSignedUrls(paths, 3600)

  if (data) {
    for (let i = 0; i < CATEGORIES.length; i++) {
      if (data[i]?.signedUrl) {
        urls[CATEGORIES[i]] = data[i].signedUrl
      }
    }
  }

  return urls
}

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const coverUrls = await fetchCoverUrls(supabase, user.id)

  return <ExploreClient coverUrls={coverUrls} />
}
