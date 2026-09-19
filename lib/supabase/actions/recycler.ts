'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { uniqueViolationMessage } from './errors'
import { upsertRecyclerDetailsSchema, type Certification } from '@/lib/validators/recycler'
import {
  PROFILE_COOKIE,
  PROFILE_COOKIE_MAX_AGE,
  serializeProfileCookie,
} from '@/lib/auth/profile-cookie'

export async function getRecyclerDetails() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('recycler_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.recycler_id) return { error: 'Recycler profile not found', data: null }

  const { data: recycler, error: recyclerError } = await supabase
    .from('recyclers')
    .select('name, capacity_kg_per_month, npwp, nib, address')
    .eq('id', profile.recycler_id)
    .maybeSingle()

  if (recyclerError && recyclerError.code !== 'PGRST116') {
    return { error: recyclerError.message, data: null }
  }

  const { data: details, error } = await supabase
    .from('recycler_details')
    .select('*')
    .eq('recycler_id', profile.recycler_id)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    return { error: error.message, data: null }
  }

  const result = {
    ...(details ?? {}),
    name: recycler?.name ?? null,
    full_name: profile.full_name,
    npwp: recycler?.npwp ?? null,
    nib: recycler?.nib ?? null,
    address_text:
      details?.address_text && details.address_text.trim() !== ''
        ? details.address_text
        : recycler?.address ?? null,
  }

  // Fallback: jika capacity_per_month belum terisi di recycler_details
  // (mis. user onboarding sebelum migrasi), ambil dari recyclers.capacity_kg_per_month
  if (details && (details.capacity_per_month == null)) {
    if (recycler?.capacity_kg_per_month != null) {
      return { data: { ...result, capacity_per_month: recycler.capacity_kg_per_month } }
    }
  }

  return { data: result }
}

export async function upsertRecyclerDetails(
  formData: FormData,
): Promise<{ error?: string; data?: unknown; reopened?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('recycler_id')
    .eq('id', user.id)
    .single()

  if (!profile?.recycler_id) return { error: 'Recycler profile not found' }

  const name = formData.get('name') as string | null
  const fullName = formData.get('full_name') as string | null
  const npwpRaw = formData.get('npwp') as string | null
  const nibRaw = formData.get('nib') as string | null
  const acceptedMaterials = formData.getAll('accepted_materials') as string[]
  
  // Parse certifications dari JSON string
  const certificationsJson = (formData.get('certifications') as string) || '[]'
  let certifications: Certification[] = []
  try {
    certifications = JSON.parse(certificationsJson)
  } catch {
    return { error: 'Format data sertifikasi tidak valid' }
  }

  // Upload file sertifikat baru (yang belum punya URL)
  const certFiles = formData.getAll('cert_files') as File[]
  const certNames = formData.getAll('cert_names') as string[]
  
  for (let i = 0; i < certFiles.length; i++) {
    const file = certFiles[i]
    const name = certNames[i]
    if (!file || file.size === 0 || !name) continue

    const ext = file.name.split('.').pop() || 'pdf'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('recycler-certs')
      .upload(filePath, file)

    if (uploadError) {
      return { error: `Upload sertifikat "${name}" gagal: ${uploadError.message}` }
    }

    const { data: publicUrl } = supabase.storage
      .from('recycler-certs')
      .getPublicUrl(filePath)

    certifications.push({
      name,
      file_url: publicUrl.publicUrl,
      uploaded_at: new Date().toISOString(),
    })
  }

  // Kapasitas selalu disimpan dalam kg: unit "ton" dikonversi otomatis
  const capacityRaw = parseFloat(formData.get('capacity_per_month') as string)
  const capacityUnit = (formData.get('capacity_unit') as string) || 'kg'
  const capacityKg =
    Number.isFinite(capacityRaw) && capacityUnit === 'ton'
      ? capacityRaw * 1000
      : capacityRaw

  const parsed = upsertRecyclerDetailsSchema.safeParse({
    name: name?.trim() || '',
    full_name: fullName?.trim() || '',
    npwp: npwpRaw?.trim() || '',
    nib: nibRaw?.trim() || '',
    accepted_materials: acceptedMaterials,
    capacity_per_month: capacityKg,
    capacity_unit: capacityUnit,
    location_lat: parseFloat(formData.get('location_lat') as string),
    location_lng: parseFloat(formData.get('location_lng') as string),
    address_text: (formData.get('address_text') as string)?.trim() || null,
    service_radius_km: parseFloat(formData.get('service_radius_km') as string),
    certifications,
    is_active: formData.get('is_active') === 'true',
  })

  if (!parsed.success) {
    console.error('Validation error:', parsed.error.issues)
    return { error: parsed.error.issues[0].message }
  }

  const location = `POINT(${parsed.data.location_lng} ${parsed.data.location_lat})`

  // Update nama fasilitas + identitas pajak (NIB) + kapasitas (agar sinkron dgn admin list)
  const { error: recyclerError } = await supabase
    .from('recyclers')
    .update({
      name: parsed.data.name,
      npwp: parsed.data.npwp || null,
      nib: parsed.data.nib,
      capacity_kg_per_month: parsed.data.capacity_per_month,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.recycler_id)

  if (recyclerError) {
    return { error: uniqueViolationMessage(recyclerError) ?? recyclerError.message }
  }

  // Update nama lengkap akun
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.full_name })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  const { data: details, error } = await supabase
    .from('recycler_details')
    .upsert({
      recycler_id: profile.recycler_id,
      accepted_materials: parsed.data.accepted_materials,
      capacity_per_month: parsed.data.capacity_per_month,
      location,
      service_radius_km: parsed.data.service_radius_km,
      address_text: parsed.data.address_text,
      certifications: parsed.data.certifications,
      is_active: parsed.data.is_active,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'recycler_id',
    })
    .select()
    .single()

  if (error) {
    console.error('Upsert error:', error)
    return { error: error.message }
  }

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
        role: 'recycler',
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

  // Auto-reopen: jika profil DITOLAK, perbaikan oleh pemilik mengirim akun
  // kembali ke antrean verifikasi (verification_status → pending).
  const { data: recyclerNow } = await supabase
    .from('recyclers')
    .select('verification_status')
    .eq('id', profile.recycler_id)
    .single()

  let reopened = false
  if (recyclerNow?.verification_status === 'rejected') {
    const { data: reset, error: resetError } = await supabase.rpc(
      'reset_verification_to_pending',
      { p_entity_id: profile.recycler_id, p_entity_type: 'recycler' },
    )
    if (resetError) return { error: resetError.message }

    if (reset) {
      reopened = true
      await createAdminClient()
        .from('audit_log')
        .insert({
          actor_id: user.id,
          action: 'verification.reopen',
          entity_type: 'recycler',
          entity_id: profile.recycler_id,
          old_data: { verification_status: 'rejected' },
          new_data: { verification_status: 'pending' },
        })
    }
  }

  await refreshProfileCookie()
  return { data: details, reopened }
}