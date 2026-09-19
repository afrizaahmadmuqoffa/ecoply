import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Generic /dashboard redirects to role-specific dashboard
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const routes: Record<string, string> = {
    company: '/company/dashboard',
    recycler: '/recycler/dashboard',
    admin: '/admin/dashboard',
  }

  redirect(routes[profile.role] ?? '/onboarding')
}
