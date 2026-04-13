import { MessageCircle, Video, AtSign, HeartHandshake, Globe, Camera, Hash } from 'lucide-react'

interface PlatformIconProps {
  slug: string
  size?: number
  className?: string
}

const PLATFORM_CONFIG: Record<string, { bg: string; icon: any; color?: string }> = {
  instagram: { bg: 'bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888]', icon: Camera, color: 'text-white' },
  twitter: { bg: 'bg-black', icon: Hash, color: 'text-white' },
  x: { bg: 'bg-black', icon: Hash, color: 'text-white' },
  whatsapp: { bg: 'bg-[#25D366]', icon: MessageCircle, color: 'text-white' },
  facebook: { bg: 'bg-[#1877F2]', icon: Globe, color: 'text-white' },
  linkedin: { bg: 'bg-[#0A66C2]', icon: Globe, color: 'text-white' },
  tiktok: { bg: 'bg-black', icon: Video, color: 'text-white' },
  threads: { bg: 'bg-black', icon: AtSign, color: 'text-white' },
  youtube: { bg: 'bg-[#FF0000]', icon: Video, color: 'text-white' },
  // Directory / listing sites
  tryst: { bg: 'bg-[#D4A574]', icon: HeartHandshake, color: 'text-white' },
  'tryst.link': { bg: 'bg-[#D4A574]', icon: HeartHandshake, color: 'text-white' },
  slixa: { bg: 'bg-[#8B5CF6]', icon: HeartHandshake, color: 'text-white' },
  eurogirlescorts: { bg: 'bg-[#E91E63]', icon: HeartHandshake, color: 'text-white' },
  adultwork: { bg: 'bg-[#3B82F6]', icon: HeartHandshake, color: 'text-white' },
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

  const IconComponent = config.icon

  return (
    <div
      className={`rounded-full ${config.bg} flex items-center justify-center ${className}`}
      style={{ width: containerSize, height: containerSize }}
    >
      <IconComponent className={config.color ?? 'text-white'} style={{ width: size, height: size }} />
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
