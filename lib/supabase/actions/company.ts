'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { uniqueViolationMessage } from './errors'
import {
  updateCompanyProfileSchema,
  type Certification,
} from '@/lib/validators/company'
import {
  PROFILE_COOKIE,
  PROFILE_COOKIE_MAX_AGE,
  serializeProfileCookie,
} from '@/lib/auth/profile-cookie'

export async function getCompanyProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Company profile not found', data: null }

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    return { error: error.message, data: null }
  }

  return {
    data: company
      ? { ...company, full_name: profile.full_name }
      : null,
  }
}

export async function updateCompanyProfile(
  formData: FormData
): Promise<{ error?: string; success?: boolean; reopened?: boolean }> {
  // 1) Data dasar seperti nama, industri, lokasi
  const name = formData.get('name') as string | null
  const industryRaw = formData.get('industry') as string | null
  const segmentRaw = formData.get('segment') as string | null
  const npwp = formData.get('npwp') as string | null
  const nib = formData.get('nib') as string | null
  const nikRaw = formData.get('nik') as string | null
  const address_text = formData.get('address_text') as string | null
  const full_name = formData.get('full_name') as string | null
  const location_lat = formData.get('location_lat')
  const location_lng = formData.get('location_lng')

  if (!name?.trim() || !location_lat || !location_lng) {
    return { error: 'Data wajib lengkap (nama, lokasi).' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 2) Parse sertifikasi existing (yang sudah punya URL dari server)
  const certificationsJson = (formData.get('certifications') as string) || '[]'
  let certifications: Certification[] = []
  try {
    certifications = JSON.parse(certificationsJson)
  } catch {
    return { error: 'Format data sertifikasi tidak valid' }
  }

  // 3) Upload sertifikat baru (yang belum punya URL)
  const certFiles = formData.getAll('cert_files') as File[]
  const certNames = formData.getAll('cert_names') as string[]

  for (let i = 0; i < certFiles.length; i++) {
    const file = certFiles[i]
    const certName = certNames[i]
    if (!file || file.size === 0 || !certName) continue

    const ext = file.name.split('.').pop() || 'pdf'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('company-certs')
      .upload(filePath, file)

    if (uploadError) {
      return { error: `Upload sertifikat "${certName}" gagal: ${uploadError.message}` }
    }

    const { data: publicUrl } = supabase.storage
      .from('company-certs')
      .getPublicUrl(filePath)

    certifications.push({
      name: certName,
      file_url: publicUrl.publicUrl,
      uploaded_at: new Date().toISOString(),
    })
  }

  // 4) Validasi data
  const parsed = updateCompanyProfileSchema.safeParse({
    name: name.trim(),
    segment: segmentRaw?.trim() || undefined,
    industry: industryRaw?.trim() || '',
    npwp: npwp?.trim() || '',
    nib: nib?.trim() || '',
    nik: nikRaw?.trim() || '',
    location_lat: parseFloat(location_lat as string),
    location_lng: parseFloat(location_lng as string),
    address_text: address_text || null,
    full_name: full_name?.trim() || '',
    certifications,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const location = `POINT(${parsed.data.location_lng} ${parsed.data.location_lat})`

  // Cek/apabila user memiliki company_id di profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Profile perusahaan tidak ditemukan' }

  // Update companies
  const {
    error: companyError,
  } = await supabase
    .from('companies')
    .update({
      name: parsed.data.name,
      segment: parsed.data.segment ?? null,
      industry: parsed.data.industry || null,
      npwp: parsed.data.npwp || null,
      nib: parsed.data.nib || null,
      nik: parsed.data.nik || null,
      location,
      address_text: parsed.data.address_text,
      certifications: parsed.data.certifications,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.company_id)

  if (companyError) {
    return { error: uniqueViolationMessage(companyError) ?? companyError.message }
  }

  // Update profiles.full_name
  if (parsed.data.full_name) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: parsed.data.full_name })
      .eq('id', user.id)
    if (profileError) return { error: profileError.message }
  }

  // Auto-reopen: jika profil sebelumnya DITOLAK, perbaikan oleh pemilik
  // mengirim akun kembali ke antrean verifikasi (verification_status → pending).
  const { data: companyNow } = await supabase
    .from('companies')
    .select('verification_status')
    .eq('id', profile.company_id)
    .single()

  // Refresh cookie profil agar sidebar langsung konsisten
  const refreshProfileCookie = async () => {
    const cookieStore = await cookies()
    const { data: fresh } = await supabase
      .from('profiles')
      .select('full_name, verification_status')
      .eq('id', user.id)
      .single()
    cookieStore.set(
      PROFILE_COOKIE,
      serializeProfileCookie({
        role: 'company',
        full_name: fresh?.full_name ?? null,
        email: user.email ?? null,
        verification_status: fresh?.verification_status ?? null,
      }),
      {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: PROFILE_COOKIE_MAX_AGE,
      },
    )
  }

  if (companyNow?.verification_status === 'rejected') {
    const { data: reset, error: resetError } = await supabase.rpc(
      'reset_verification_to_pending',
      { p_entity_id: profile.company_id, p_entity_type: 'company' },
    )
    if (resetError) return { error: resetError.message }

    if (reset) {
      await createAdminClient()
        .from('audit_log')
        .insert({
          actor_id: user.id,
          action: 'verification.reopen',
          entity_type: 'company',
          entity_id: profile.company_id,
          old_data: { verification_status: 'rejected' },
          new_data: { verification_status: 'pending' },
        })
      await refreshProfileCookie()
      return { success: true, reopened: true }
    }
  }

  await refreshProfileCookie()
  return { success: true }
}