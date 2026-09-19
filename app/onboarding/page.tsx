import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * /onboarding — smart redirect berdasarkan state user.
 * Tidak ada UI di sini, semua di sub-routes.
 */
export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Sudah punya profil lengkap
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile) {
    const routes: Record<string, string> = {
      company: '/company/dashboard',
      recycler: '/recycler/dashboard',
      admin: '/admin/dashboard',
    }
    redirect(routes[profile.role] ?? '/dashboard')
  }

  // Sudah pilih role tapi belum setup profil
  const intendedRole = user.user_metadata?.role as string | undefined
  if (intendedRole === 'recycler') redirect('/onboarding/profile/recycler')
  if (intendedRole === 'company') redirect('/onboarding/profile/company')

  // Belum pilih role
  redirect('/onboarding/role')
}
