import { createServiceClient } from '@/lib/supabase/service'

export async function createNotification(
  profileId: string,
  type: 'discovery' | 'performance' | 'system',
  title: string,
  body?: Record<string, any>,
) {
  const supabase = createServiceClient()
  await supabase.from('notifications').insert({
    profile_id: profileId,
    type,
    title,
    body: body ?? {},
  })
}
