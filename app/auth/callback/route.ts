import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_OTP_TYPES = [
  'email',
  'sms',
  'email_change',
  'magiclink',
  'recovery',
  'invite',
  'signup',
] as const

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/onboarding/role'
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const tokenType = searchParams.get('type')

  const supabase = await createClient()

  let errorMessage: string | null = null

  if (code) {
    // Alur PKCE / magic link — code ditukar dengan session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    errorMessage = error?.message ?? null
  } else if (tokenHash && tokenType) {
    // Alur OTP — verifikasi token_hash langsung
    const validType = VALID_OTP_TYPES.find((t) => t === tokenType)
    if (validType) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: validType,
      })
      errorMessage = error?.message ?? null
    } else {
      errorMessage = `Unknow token type: ${tokenType}`
    }
  } else {
    errorMessage = 'Missing code or token_hash'
  }

  if (errorMessage) {
    console.error('[auth/callback] verifikasi gagal:', {
      hasCode: Boolean(code),
      hasTokenHash: Boolean(tokenHash),
      error: errorMessage,
    })
    const errorUrl = new URL('/login', request.url)
    errorUrl.searchParams.set('error', 'auth_callback_failed')
    errorUrl.searchParams.set('reason', errorMessage)
    return NextResponse.redirect(errorUrl)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('[auth/callback] user tidak ditemukan setelah verifikasi')
    const errorUrl = new URL('/login', request.url)
    errorUrl.searchParams.set('error', 'auth_callback_failed')
    errorUrl.searchParams.set('reason', 'no_user_after_verification')
    return NextResponse.redirect(errorUrl)
  }

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