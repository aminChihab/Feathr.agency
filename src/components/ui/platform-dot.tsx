import { ensureVisibleColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PlatformDotProps {
  color: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

export function PlatformDot({ color, size = 'md', className }: PlatformDotProps) {
  return (
    <div
      className={cn('rounded-full flex-shrink-0', SIZES[size], className)}
      style={{ backgroundColor: ensureVisibleColor(color) }}
    />
  )
}
