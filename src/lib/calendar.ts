import type { Database } from '@/types/database'

type CalendarItem = Database['public']['Tables']['content_calendar']['Row']

export interface PostWithPlatform extends CalendarItem {
  platform_name: string
  platform_color: string
}

/** Returns an array of 7 Date objects for the week containing `date` (Mon-Sun). */
export function getWeekDays(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun ... 6=Sat
  const diffToMon = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diffToMon)
  return Array.from({ length: 7 }, (_, i) => {
    const copy = new Date(d)
    copy.setDate(d.getDate() + i)
    return copy
  })
}

/** Returns an array of Date objects for a calendar month grid (always full weeks, Mon-first). */
export function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startOffset = (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - startOffset)

  const endOffset = (lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay())
  const gridEnd = new Date(lastDay)
  gridEnd.setDate(lastDay.getDate() + endOffset)

  const days: Date[] = []
  const cur = new Date(gridStart)
  while (cur <= gridEnd) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function postsForDay(posts: PostWithPlatform[], day: Date): PostWithPlatform[] {
  return posts.filter((p) => {
    if (!p.scheduled_at) return false
    return isSameDay(new Date(p.scheduled_at), day)
  })
}
