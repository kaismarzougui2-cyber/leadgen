import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Safety net cron: resets quotas for inactive users who never trigger the inline check.
// Runs daily. The primary reset happens inline in /api/search when 30 days have passed.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Reset subscriptions where period_start is older than 30 days
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const { error, count } = await supabase
    .from('subscriptions')
    .update({ searches_used: 0, period_start: new Date().toISOString(), updated_at: new Date().toISOString() })
    .lt('period_start', cutoff)
    .gt('searches_used', 0)
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('Quota reset error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, reset: count })
}
