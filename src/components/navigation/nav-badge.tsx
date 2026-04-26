// src/components/navigation/nav-badge.tsx
interface NavBadgeProps {
  count: number
}

export function NavBadge({ count }: NavBadgeProps) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-on-primary">
      {count > 99 ? '99+' : count}
    </span>
  )
}
