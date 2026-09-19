import { NextRequest, NextResponse } from 'next/server'
import { recordOpsEvent } from '@/lib/ops/events'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * POST /api/cron/heartbeat
 * Called by Vercel Cron. Guarded with CRON_SECRET.
 * Writes a heartbeat row into ops_events and purges stale rate-limit
 * windows older than 24h.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // Purge stale rate-limit counters (24h+)
    await admin
      .from('api_rate_limits')
      .delete()
      .lt('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  } catch (err) {
    console.error('[Cron] purge failed:', err)
  }

  await recordOpsEvent({
    kind: 'cron',
    level: 'info',
    message: 'Heartbeat OK',
    source: 'vercel-cron',
  })

  return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
}