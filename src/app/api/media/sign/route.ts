import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signFullResUrl } from '@/lib/storage'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const storagePath = request.nextUrl.searchParams.get('path')
  if (!storagePath) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }

  // Verify the item belongs to this user
  const { data: item } = await supabase
    .from('content_library')
    .select('id')
    .eq('profile_id', user.id)
    .eq('storage_path', storagePath)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = await signFullResUrl(supabase, storagePath)
  if (!url) {
    return NextResponse.json({ error: 'Failed to sign URL' }, { status: 500 })
  }

  return NextResponse.json({ url })
}
