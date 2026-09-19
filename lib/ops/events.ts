import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/supabase'

/**
 * Append a row to `public.ops_events` using the service-role client
 * (bypasses RLS; the table only allows `is_admin()` SELECT otherwise).
 */
export async function recordOpsEvent(
  input: {
    kind: string
    level?: 'info' | 'warn' | 'error'
    message: string
    source?: string
    metadata?: Json
  },
): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('ops_events').insert({
      kind: input.kind,
      level: input.level ?? 'info',
      message: input.message,
      source: input.source ?? null,
      metadata: (input.metadata ?? {}) as Json,
    })
    if (error) {
      console.error('[OpsEvent] insert failed:', error.message)
    }
  } catch (err) {
    console.error('[OpsEvent] unexpected:', err)
  }
}