'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleActionItem(
  actionItemId: string,
  completed: boolean,
  jobId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { error } = await supabase
    .from('audit_action_items')
    .update({
      completed,
      completed_by: completed ? user.id : null,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', actionItemId)

  if (error) return { error: error.message }
  revalidatePath(`/company/compliance/${jobId}`)
  return {}
}
