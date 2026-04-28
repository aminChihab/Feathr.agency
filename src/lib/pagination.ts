export const PAGE_SIZES = {
  media: 24,
  posts: 20,
  conversations: 30,
  messages: 50,
} as const

export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  totalCount?: number
}

/**
 * Applies cursor-based pagination to an already-fetched array.
 * The caller should fetch pageSize + 1 rows. If we got more than pageSize,
 * there's a next page — return only pageSize items and the last item's
 * created_at as the cursor.
 */
export function applyCursorPagination<T extends { id: string; created_at: string }>(
  rows: T[],
  pageSize: number,
): PaginatedResult<T> {
  const hasMore = rows.length > pageSize
  const items = hasMore ? rows.slice(0, pageSize) : rows
  const nextCursor = hasMore ? items[items.length - 1].created_at : null
  return { items, nextCursor }
}
