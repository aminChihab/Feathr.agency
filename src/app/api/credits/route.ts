import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: credits } = await supabase
    .from('credits')
    .select('balance, total_granted, total_used')
    .eq('profile_id', user.id)
    .single()

  if (!credits) {
    const { data: newCredits } = await supabase
      .from('credits')
      .insert({ profile_id: user.id, balance: 50, total_granted: 50, total_used: 0 })
      .select('balance, total_granted, total_used')
      .single()
    return NextResponse.json(newCredits ?? { balance: 50, total_granted: 50, total_used: 0 })
  }

  return NextResponse.json(credits)
}
