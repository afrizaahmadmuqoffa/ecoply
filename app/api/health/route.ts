import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * GET /api/health
 * Lightweight liveness + DB connectivity check. Public (uptime monitors, cron).
 */
export async function GET() {
  const admin = createAdminClient()
  let dbOk = true
  let dbError: string | null = null

  try {
    const { error } = await admin.from('profiles').select('id').limit(1)
    if (error) {
      dbOk = false
      dbError = error.message
    }
  } catch (err) {
    dbOk = false
    dbError = err instanceof Error ? err.message : 'Unknown error'
  }

  return NextResponse.json(
    {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db: dbOk ? 'ok' : 'error',
      dbError,
    },
    { status: dbOk ? 200 : 503 },
  )
}