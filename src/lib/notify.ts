import { createClient as createServerClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createNotification(
  profileId: string,
  type: 'discovery' | 'performance' | 'system',
  title: string,
  body?: Record<string, any>,
) {
  const supabase = getServiceClient()
  await supabase.from('notifications').insert({
    profile_id: profileId,
    type,
    title,
    body: body ?? {},
  })
}
