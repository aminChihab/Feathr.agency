import { MessageCircle, Video, AtSign, HeartHandshake, Globe } from 'lucide-react'
import Image from 'next/image'

interface PlatformIconProps {
  slug: string
  size?: number
  className?: string
}

const PLATFORM_CONFIG: Record<string, { bg: string; type: 'lucide' | 'svg'; icon?: any; svg?: string; color?: string }> = {
  instagram: { bg: 'bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888]', type: 'svg', svg: '/instagram.svg' },
  twitter: { bg: 'bg-black', type: 'svg', svg: '/twitter.svg' },
  x: { bg: 'bg-black', type: 'svg', svg: '/twitter.svg' },
  whatsapp: { bg: 'bg-[#25D366]', type: 'lucide', icon: MessageCircle, color: 'text-white' },
  facebook: { bg: 'bg-[#1877F2]', type: 'lucide', icon: Globe, color: 'text-white' },
  linkedin: { bg: 'bg-[#0A66C2]', type: 'lucide', icon: Globe, color: 'text-white' },
  tiktok: { bg: 'bg-black', type: 'lucide', icon: Video, color: 'text-white' },
  threads: { bg: 'bg-black', type: 'lucide', icon: AtSign, color: 'text-white' },
  youtube: { bg: 'bg-[#FF0000]', type: 'lucide', icon: Video, color: 'text-white' },
  // Directory / listing sites
  tryst: { bg: 'bg-[#D4A574]', type: 'lucide', icon: HeartHandshake, color: 'text-white' },
  'tryst.link': { bg: 'bg-[#D4A574]', type: 'lucide', icon: HeartHandshake, color: 'text-white' },
  slixa: { bg: 'bg-[#8B5CF6]', type: 'lucide', icon: HeartHandshake, color: 'text-white' },
  eurogirlescorts: { bg: 'bg-[#E91E63]', type: 'lucide', icon: HeartHandshake, color: 'text-white' },
  adultwork: { bg: 'bg-[#3B82F6]', type: 'lucide', icon: HeartHandshake, color: 'text-white' },
}

export function PlatformIcon({ slug, size = 20, className = '' }: PlatformIconProps) {
  const normalizedSlug = slug.toLowerCase().replace(/[\s\/]/g, '')
  const config = PLATFORM_CONFIG[normalizedSlug] ?? PLATFORM_CONFIG[slug] ?? null

  const containerSize = size + 16 // padding around icon

  if (!config) {
    return (
      <div
        className={`rounded-full bg-surface-container-highest flex items-center justify-center ${className}`}
        style={{ width: containerSize, height: containerSize }}
      >
        <span className="text-on-surface-variant font-display text-sm">
          {slug.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-full ${config.bg} flex items-center justify-center ${className}`}
      style={{ width: containerSize, height: containerSize }}
    >
      {config.type === 'svg' && config.svg ? (
        <Image src={config.svg} alt={slug} width={size} height={size} className="invert" />
      ) : config.icon ? (
        <config.icon className={`${config.color ?? 'text-white'}`} style={{ width: size, height: size }} />
      ) : null}
    </div>
  )
}

/** Small colored dot for inline platform indicators */
export function PlatformDot({ color, className = '' }: { color?: string; className?: string }) {
  return (
    <div
      className={`w-2.5 h-2.5 rounded-full shrink-0 ${className}`}
      style={{ backgroundColor: color ?? '#666' }}
    />
  )
}
