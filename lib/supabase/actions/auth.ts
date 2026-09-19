'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { PROFILE_COOKIE } from '@/lib/auth/profile-cookie'
import { uniqueViolationMessage } from './errors'
import {
  signUpSchema,
  signInSchema,
  selectRoleSchema,
  companyOnboardingSchema,
  recyclerOnboardingSchema,
  type SignUpInput,
  type SignInInput,
  type SelectRoleInput,
  type CompanyOnboardingInput,
  type RecyclerOnboardingInput,
} from '@/lib/validators/auth'

type ActionResult = {
  error?: string
  success?: boolean
}

function firstZodError(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? 'Input tidak valid'
}

// ─────────────────────────────────────────────
// STEP 1: Register (email + password + nama)
// Role TIDAK diminta di sini — dipilih setelah verifikasi email
// ─────────────────────────────────────────────
export async function signUp(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Redirect setelah klik link email → /auth/callback → /onboarding/role
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback?next=/onboarding/role`,
      data: {
        full_name: parsed.data.fullName,
      },
    },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'Gagal membuat akun' }

  return { success: true }
}

// ─────────────────────────────────────────────
// STEP 2: Pilih role (setelah email terverifikasi)
// Simpan role ke user_metadata Supabase Auth,
// lalu redirect ke form setup profil yang sesuai
// ─────────────────────────────────────────────
export async function selectRole(input: SelectRoleInput): Promise<ActionResult> {
  const parsed = selectRoleSchema.safeParse(input)
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Sesi tidak ditemukan. Silakan login ulang.' }

  // Pastikan belum punya profil (idempotent guard)
  const { data: existing } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (existing) {
    const routes: Record<string, string> = {
      company: '/company/dashboard',
      recycler: '/recycler/dashboard',
      admin: '/admin/dashboard',
    }
    redirect(routes[existing.role] ?? '/dashboard')
  }

  // Simpan role ke user_metadata supaya halaman setup profil bisa baca
  const { error: updateError } = await supabase.auth.updateUser({
    data: { role: parsed.data.role },
  })

  if (updateError) return { error: updateError.message }

  redirect(
    parsed.data.role === 'recycler'
      ? '/onboarding/profile/recycler'
      : '/onboarding/profile/company',
  )
}

// ─────────────────────────────────────────────
// SIGN IN
// ─────────────────────────────────────────────
export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { error: 'Email atau password salah' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Gagal login' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Belum selesai onboarding
  if (!profile) {
    const intendedRole = user.user_metadata?.role as string | undefined
    if (!intendedRole) redirect('/onboarding/role')
    redirect(
      intendedRole === 'recycler'
        ? '/onboarding/profile/recycler'
        : '/onboarding/profile/company',
    )
  }

  const roleRoutes: Record<string, string> = {
    company: '/company/dashboard',
    recycler: '/recycler/dashboard',
    admin: '/admin/dashboard',
  }

  redirect(roleRoutes[profile.role])
}

// ─────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const cookieStore = await cookies()
  // Bersihkan cookie profile + marker gate (vg-ok) agar tidak basi di session baru
  cookieStore.set(PROFILE_COOKIE, '', { path: '/', maxAge: 0 })
  cookieStore.set('vg-ok', '', { path: '/', maxAge: 0 })

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ─────────────────────────────────────────────
// STEP 3a: Setup profil perusahaan
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// STEP 3a: Setup profil perusahaan
// ─────────────────────────────────────────────
// Helper: generate fallback address jika reverse geocoding gagal
function generateFallbackAddress(lat: number, lng: number): string {
  return `Lokasi di koordinat ${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

// ─────────────────────────────────────────────
// STEP 3a: Setup profil perusahaan
// ─────────────────────────────────────────────
export async function setupCompanyProfile(
  input: CompanyOnboardingInput,
): Promise<ActionResult> {
  const parsed = companyOnboardingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Tidak terautentikasi' }

  // Idempotensi
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()

  let companyId = existingCompany?.id ?? null

  // Build location Point jika ada koordinat
  const hasLocation =
    parsed.data.location_lat !== undefined && parsed.data.location_lng !== undefined

  const location = hasLocation
    ? `POINT(${parsed.data.location_lng} ${parsed.data.location_lat})`
    : null

  // ✅ Fallback address jika kosong
  const addressText =
    parsed.data.address_text && parsed.data.address_text.length > 0
      ? parsed.data.address_text
      : hasLocation
        ? generateFallbackAddress(parsed.data.location_lat!, parsed.data.location_lng!)
        : null

  if (!companyId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyPayload: any = {
      user_id: user.id,
      name: parsed.data.name,
      segment: parsed.data.segment,
      industry: parsed.data.industry ?? null,
      address: addressText ?? null,
      npwp: parsed.data.npwp || null,
      nib: parsed.data.nib || null,
      nik: parsed.data.nik || null,
      location: location ?? null,
      address_text: addressText ?? null,
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert(companyPayload)
      .select('id')
      .single()

    if (companyError) {
      return { error: uniqueViolationMessage(companyError) ?? companyError.message }
    }
    companyId = company.id
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    role: 'company',
    company_id: companyId,
    full_name: user.user_metadata?.full_name ?? null,
    verification_status: 'pending',
  })

  if (profileError) return { error: profileError.message }

  redirect('/company/dashboard')
}

// ─────────────────────────────────────────────
// STEP 3b: Setup profil recycler
// ─────────────────────────────────────────────
export async function setupRecyclerProfile(
  input: RecyclerOnboardingInput,
): Promise<ActionResult> {
  const parsed = recyclerOnboardingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Tidak terautentikasi' }

  // Build location Point & alamat (fallback dari koordinat jika reverse geocoding kosong)
  const hasLocation =
    parsed.data.location_lat !== undefined && parsed.data.location_lng !== undefined

  const location = hasLocation
    ? `POINT(${parsed.data.location_lng} ${parsed.data.location_lat})`
    : null

  const addressText =
    parsed.data.address_text && parsed.data.address_text.length > 0
      ? parsed.data.address_text
      : hasLocation
        ? generateFallbackAddress(parsed.data.location_lat!, parsed.data.location_lng!)
        : null

  // Idempotensi
  const { data: existingRecycler } = await supabase
    .from('recyclers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  let recyclerId = existingRecycler?.id ?? null

  if (!recyclerId) {
    const { data: recycler, error: recyclerError } = await supabase
      .from('recyclers')
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        address: addressText ?? null,
        npwp: parsed.data.npwp,
        nib: parsed.data.nib,
        capacity_kg_per_month: parsed.data.capacityKgPerMonth ?? null,
      })
      .select('id')
      .single()

    if (recyclerError) return { error: recyclerError.message }
    recyclerId = recycler.id
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    role: 'recycler',
    recycler_id: recyclerId,
    full_name: user.user_metadata?.full_name ?? null,
    verification_status: 'pending',
  })

  if (profileError) return { error: profileError.message }

  // Upsert recycler_details dengan lokasi, radius & alamat
  const { error: detailsError } = await supabase.from('recycler_details').upsert(
    {
      recycler_id: recyclerId,
      location,
      service_radius_km: parsed.data.service_radius_km ?? 50,
      accepted_materials: [],
      is_active: true,
      capacity_per_month: parsed.data.capacityKgPerMonth ?? null,
    },
    { onConflict: 'recycler_id' },
  )

  if (detailsError) return { error: detailsError.message }

  redirect('/recycler/profile')
}