import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'
import type { UserRole } from '@/types/roles'
import {
  PROFILE_COOKIE,
  PROFILE_COOKIE_MAX_AGE,
  serializeProfileCookie,
} from '@/lib/auth/profile-cookie'

const ROLE_ROUTES: Record<UserRole, string> = {
  company: '/company',
  recycler: '/recycler',
  admin: '/admin',
}

// Marker yang diberikan saat user BELUM terverifikasi diizinkan lewat proxy
// (hanya halaman tertentu: /verify/blocked dan halaman edit profil).
// Layout membacanya sebagai lapisan pertahanan kedua.
const GATE_COOKIE = 'vg-ok'
const BLOCKED_PATH = '/verify/blocked'
const ENTITY_PROFILE_PATHS: Record<string, string> = {
  company: '/company/profile',
  recycler: '/recycler/profile',
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — must be called before any auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public paths — always accessible
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/auth/callback',
    '/auth/confirm',
    '/verify',
  ]
  if (
    publicPaths.some((p) => pathname === p || pathname.startsWith('/auth/'))
    || pathname.startsWith('/verify/')
  ) {
    // Redirect already-logged-in users away from auth pages
    if (user && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Protected: not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based routing guard
  for (const [role, prefix] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, verification_status')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== role) {
        // Redirect to the user's correct dashboard
        const correctPrefix =
          profile?.role ? ROLE_ROUTES[profile.role as UserRole] : '/login'
        return NextResponse.redirect(new URL(correctPrefix, request.url))
      }

      // Cookie profil dibaca layout (lapisan kedua) — refresh tiap request
      response.cookies.set(
        PROFILE_COOKIE,
        serializeProfileCookie({
          role: profile.role,
          full_name: profile.full_name,
          email: user.email ?? null,
          verification_status: profile.verification_status,
        }),
        {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: PROFILE_COOKIE_MAX_AGE,
        },
      )

      // ── GATE VERIFIKASI ─────────────────────────────────────
      if (
        profile.role !== 'admin' &&
        profile.verification_status &&
        profile.verification_status !== 'verified'
      ) {
        const pathAllowed =
          pathname === BLOCKED_PATH ||
          (profile.verification_status === 'rejected' &&
            pathname === ENTITY_PROFILE_PATHS[profile.role])

        if (!pathAllowed) {
          return NextResponse.redirect(new URL(BLOCKED_PATH, request.url))
        }

        // Diizinkan (halaman blocked / edit profil) → tandai layout
        response.cookies.set(GATE_COOKIE, '1', {
          path: '/',
          httpOnly: false,
          sameSite: 'lax',
          maxAge: 600,
        })
      }

      break
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
