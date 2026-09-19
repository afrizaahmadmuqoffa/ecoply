import { createAdminClient } from '@/lib/supabase/admin'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterMs?: number
}

/**
 * Sliding-window rate limit counter backed by `public.api_rate_limits`
 * (written via service-role; denied to all other roles by RLS).
 *
 * - Keys are namespaced by the caller, e.g. `carbon-extract:<userId>`.
 * - Window buckets are aligned to wall-clock boundaries of `windowMs`.
 * - Fail-open on storage errors so a table hiccup never blocks the route.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const admin = createAdminClient()
  const now = Date.now()
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs)
  const ws = windowStart.toISOString()

  const { data: existing, error: readError } = await admin
    .from('api_rate_limits')
    .select('count')
    .eq('key', key)
    .eq('window_start', ws)
    .maybeSingle()

  if (readError) {
    console.error('[RateLimit] read failed, failing open:', readError.message)
    return { allowed: true, remaining: limit }
  }

  const count = existing?.count ?? 0

  if (count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowStart.getTime() + windowMs - now,
    }
  }

  const { error: writeError } = await admin.from('api_rate_limits').upsert(
    { key, window_start: ws, count: count + 1 },
    { onConflict: 'key,window_start' },
  )

  if (writeError) {
    console.error('[RateLimit] upsert failed, failing open:', writeError.message)
    return { allowed: true, remaining: limit - count - 1 }
  }

  return { allowed: true, remaining: limit - count - 1 }
}

export { recordOpsEvent } from '@/lib/ops/events'