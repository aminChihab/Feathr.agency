// src/lib/explore-data.ts

export interface ExploreIdea {
  id: string
  imageUrl: string
  caption: string
  category: string
  platform: 'instagram' | 'twitter' | 'tiktok'
}

export interface TrendingPost {
  id: string
  text: string
  authorHandle: string
  platform: 'instagram' | 'twitter' | 'tiktok'
  likes: number
  replies: number
  reposts: number
  category: string
}

export const CATEGORIES = [
  'Lingerie',
  'Lifestyle',
  'Promotional',
  'Behind the Scenes',
  'Glam',
  'Travel',
  'Fitness',
  'Seasonal',
] as const

export type Category = (typeof CATEGORIES)[number]

export const PLACEHOLDER_IDEAS: ExploreIdea[] = [
  { id: 'i1', imageUrl: 'https://picsum.photos/seed/feat1/400/600', caption: 'Mirror selfie in silk robe — morning light hitting just right', category: 'Lingerie', platform: 'instagram' },
  { id: 'i2', imageUrl: 'https://picsum.photos/seed/feat2/400/500', caption: 'Coffee run fit check. Oversized blazer + heels energy', category: 'Lifestyle', platform: 'instagram' },
  { id: 'i3', imageUrl: 'https://picsum.photos/seed/feat3/400/700', caption: 'New set just dropped — link in bio for the full gallery', category: 'Promotional', platform: 'twitter' },
  { id: 'i4', imageUrl: 'https://picsum.photos/seed/feat4/400/550', caption: 'BTS from yesterday\'s shoot — the team was amazing', category: 'Behind the Scenes', platform: 'instagram' },
  { id: 'i5', imageUrl: 'https://picsum.photos/seed/feat5/400/650', caption: 'Red lip, slicked back hair, that\'s it. That\'s the post.', category: 'Glam', platform: 'instagram' },
  { id: 'i6', imageUrl: 'https://picsum.photos/seed/feat6/400/500', caption: 'Bali sunset from the villa balcony — living my best life', category: 'Travel', platform: 'tiktok' },
  { id: 'i7', imageUrl: 'https://picsum.photos/seed/feat7/400/600', caption: 'Post-gym glow. This pump is unreal', category: 'Fitness', platform: 'instagram' },
  { id: 'i8', imageUrl: 'https://picsum.photos/seed/feat8/400/700', caption: 'Valentine\'s Day special — DM me for custom content', category: 'Seasonal', platform: 'twitter' },
  { id: 'i9', imageUrl: 'https://picsum.photos/seed/feat9/400/550', caption: 'Lace details. Sometimes less is more.', category: 'Lingerie', platform: 'instagram' },
  { id: 'i10', imageUrl: 'https://picsum.photos/seed/feat10/400/600', caption: 'Grocery store in heels because why not', category: 'Lifestyle', platform: 'tiktok' },
  { id: 'i11', imageUrl: 'https://picsum.photos/seed/feat11/400/500', caption: 'Flash sale — 50% off subscription this weekend only', category: 'Promotional', platform: 'twitter' },
  { id: 'i12', imageUrl: 'https://picsum.photos/seed/feat12/400/650', caption: 'Setting up lights for tonight\'s shoot', category: 'Behind the Scenes', platform: 'instagram' },
  { id: 'i13', imageUrl: 'https://picsum.photos/seed/feat13/400/700', caption: 'Smoky eye tutorial coming soon — save this look', category: 'Glam', platform: 'tiktok' },
  { id: 'i14', imageUrl: 'https://picsum.photos/seed/feat14/400/500', caption: 'Hotel room views in Dubai — next stop: Monaco', category: 'Travel', platform: 'instagram' },
  { id: 'i15', imageUrl: 'https://picsum.photos/seed/feat15/400/600', caption: 'Yoga flow for the timeline. Namaste babe', category: 'Fitness', platform: 'instagram' },
  { id: 'i16', imageUrl: 'https://picsum.photos/seed/feat16/400/550', caption: 'Summer vibes loading... bikini season is HERE', category: 'Seasonal', platform: 'instagram' },
  { id: 'i17', imageUrl: 'https://picsum.photos/seed/feat17/400/700', caption: 'Black bodysuit appreciation post', category: 'Lingerie', platform: 'instagram' },
  { id: 'i18', imageUrl: 'https://picsum.photos/seed/feat18/400/500', caption: 'Cooking in lingerie because content never sleeps', category: 'Lifestyle', platform: 'tiktok' },
  { id: 'i19', imageUrl: 'https://picsum.photos/seed/feat19/400/600', caption: 'Custom video requests open — limited spots this week', category: 'Promotional', platform: 'twitter' },
  { id: 'i20', imageUrl: 'https://picsum.photos/seed/feat20/400/650', caption: 'Golden hour magic — no filter needed', category: 'Glam', platform: 'instagram' },
]

export const PLACEHOLDER_TRENDING: TrendingPost[] = [
  { id: 't1', text: 'What\'s your go-to outfit for a first date? I need ideas', authorHandle: '@datemeplz', platform: 'twitter', likes: 4200, replies: 380, reposts: 120, category: 'Lifestyle' },
  { id: 't2', text: 'Creators who post consistently for 90 days straight see 3x growth. Most quit at day 12. Don\'t be most.', authorHandle: '@creatorcoach', platform: 'twitter', likes: 12800, replies: 640, reposts: 2100, category: 'Promotional' },
  { id: 't3', text: 'The gym at 5am hits different. Who else is on that grind?', authorHandle: '@fitlife', platform: 'twitter', likes: 8900, replies: 520, reposts: 340, category: 'Fitness' },
  { id: 't4', text: 'Unpopular opinion: natural lighting > ring light for content. Fight me.', authorHandle: '@photopro', platform: 'twitter', likes: 6700, replies: 890, reposts: 450, category: 'Behind the Scenes' },
  { id: 't5', text: 'Drop your favorite travel destination for content shoots. I\'ll go first: Tulum', authorHandle: '@wanderlust', platform: 'twitter', likes: 3400, replies: 670, reposts: 89, category: 'Travel' },
  { id: 't6', text: 'Valentine\'s content ideas thread (saving you hours of planning)', authorHandle: '@contentqueen', platform: 'twitter', likes: 15200, replies: 430, reposts: 3200, category: 'Seasonal' },
  { id: 't7', text: 'PSA: Your phone camera is good enough. Stop waiting for the perfect setup and just start posting.', authorHandle: '@realtalk', platform: 'twitter', likes: 22000, replies: 1200, reposts: 5600, category: 'Behind the Scenes' },
  { id: 't8', text: 'Lingerie haul try-ons get 4x more saves than regular posts. The algorithm knows what it wants.', authorHandle: '@analyticsnerds', platform: 'twitter', likes: 9400, replies: 310, reposts: 780, category: 'Lingerie' },
  { id: 't9', text: 'Who else plans their entire week\'s content on Sunday? Drop your workflow below', authorHandle: '@sundayplanner', platform: 'twitter', likes: 5600, replies: 890, reposts: 230, category: 'Lifestyle' },
  { id: 't10', text: 'Glam transformation reels are STILL going viral. Here\'s the format that works every time...', authorHandle: '@viralformula', platform: 'twitter', likes: 18300, replies: 720, reposts: 4100, category: 'Glam' },
]
