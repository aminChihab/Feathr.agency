import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, reason, metadata } = await request.json()
  if (!amount || !reason) {
    return NextResponse.json({ error: 'Missing amount or reason' }, { status: 400 })
  }

  const { data: credits } = await supabase
    .from('credits')
    .select('balance, total_used')
    .eq('profile_id', user.id)
    .single()

  if (!credits || credits.balance < amount) {
    return NextResponse.json({ error: 'Insufficient credits', balance: credits?.balance ?? 0 }, { status: 402 })
  }

  const newBalance = credits.balance - amount
  const newUsed = (credits.total_used ?? 0) + amount

  await supabase
    .from('credits')
    .update({ balance: newBalance, total_used: newUsed, updated_at: new Date().toISOString() })
    .eq('profile_id', user.id)

  await supabase.from('credit_transactions').insert({
    profile_id: user.id,
    amount: -amount,
    reason,
    metadata: metadata ?? null,
  })

  return NextResponse.json({ balance: newBalance })
}
