import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding/role'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // User sudah punya profil lengkap → langsung ke dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) {
          const roleRoutes: Record<string, string> = {
            company: '/company/dashboard',
            recycler: '/recycler/dashboard',
            admin: '/admin/dashboard',
          }
          return NextResponse.redirect(
            `${origin}${roleRoutes[profile.role] ?? '/dashboard'}`,
          )
        }

        // User sudah pilih role tapi belum setup profil
        const intendedRole = user.user_metadata?.role as string | undefined
        if (intendedRole === 'recycler') {
          return NextResponse.redirect(`${origin}/onboarding/profile/recycler`)
        }
        if (intendedRole === 'company') {
          return NextResponse.redirect(`${origin}/onboarding/profile/company`)
        }

        // Belum pilih role sama sekali → ke step pilih role
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
