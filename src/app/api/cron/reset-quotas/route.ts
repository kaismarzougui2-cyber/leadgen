import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Called by Vercel Cron on the 1st of each month at 00:00 UTC
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/reset-quotas", "schedule": "0 0 1 * *" }] }
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { error, count } = await supabase
    .from('subscriptions')
    .update({ searches_used: 0, updated_at: new Date().toISOString() })
    .neq('searches_used', 0) // skip rows already at 0
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('Quota reset error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`Quota reset: ${count} subscriptions reset`)
  return NextResponse.json({ ok: true, reset: count })
}
