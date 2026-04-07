// src/lib/conversations.ts

interface ConversationInput {
  created_at: string
  last_message_at: string | null
  client_id: string | null
  status: string
  message_count: number
  platform_slug: string
  has_lead: boolean
  client_total_bookings: number
}

interface ComputedFields {
  status: string
  priority: string
  type: string
}

const FAN_PLATFORMS = ['onlyfans', 'fansly', 'loyalfans', 'manyvids']

export function computeConversationFields(conv: ConversationInput): ComputedFields {
  // Don't override manual spam
  if (conv.status === 'spam') {
    return { status: 'spam', priority: 'cold', type: 'spam' }
  }

  const now = Date.now()
  const createdAt = new Date(conv.created_at).getTime()
  const lastMessageAt = conv.last_message_at ? new Date(conv.last_message_at).getTime() : createdAt
  const ageMs = now - createdAt
  const lastActivityMs = now - lastMessageAt

  const hours48 = 48 * 60 * 60 * 1000
  const hours24 = 24 * 60 * 60 * 1000
  const days3 = 3 * 24 * 60 * 60 * 1000
  const weeks2 = 14 * 24 * 60 * 60 * 1000

  // Status
  let status: string
  if (conv.client_id) {
    status = 'qualified'
  } else if (lastActivityMs > weeks2) {
    status = 'archived'
  } else if (lastActivityMs < hours24) {
    status = 'active'
  } else if (ageMs < hours48) {
    status = 'new'
  } else {
    status = 'active'
  }

  // Priority
  let priority: string
  if (conv.message_count >= 3 && lastActivityMs < hours24) {
    priority = 'hot'
  } else if (conv.message_count >= 2 || lastActivityMs < days3) {
    priority = 'warm'
  } else {
    priority = 'cold'
  }

  // Type
  let type: string
  if (FAN_PLATFORMS.includes(conv.platform_slug)) {
    type = 'fan'
  } else if (conv.client_id && conv.client_total_bookings >= 1) {
    type = 'returning_client'
  } else if (conv.has_lead) {
    type = 'booking'
  } else {
    type = 'other'
  }

  return { status, priority, type }
}
