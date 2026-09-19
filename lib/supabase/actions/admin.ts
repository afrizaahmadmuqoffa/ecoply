'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/supabase'
import {
  verifyEntitySchema,
  createRegulationSchema,
  updateRegulationSchema,
  bulkVerifyEntitiesSchema,
  type VerifyEntityInput,
  type CreateRegulationInput,
  type UpdateRegulationInput,
  type BulkVerifyEntitiesInput,
} from '@/lib/validators/admin'
type ActionResult = { error?: string; success?: boolean }

function firstZodError(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? 'Input tidak valid'
}

// ── Auth guard helper ──────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase, error: 'Tidak terautentikasi' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { user: null, supabase, error: 'Akses ditolak' as const }
  }
  return { user, supabase, error: null }
}

// ── Audit log helper ───────────────────────────────────────

async function writeAuditLog(
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldData?: Json,
  newData?: Json,
) {
  // Use admin client so RLS doesn't block insert
  const admin = createAdminClient()
  await admin.from('audit_log').insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  })
}

// ============================================================
// VERIFICATION
// ============================================================

export async function verifyEntity(input: VerifyEntityInput): Promise<ActionResult> {
  const parsed = verifyEntitySchema.safeParse(input)
  if (!parsed.success) return { error: firstZodError(parsed.error) }

  const { user, error: authError } = await requireAdmin()
  if (authError || !user) return { error: authError ?? 'Akses ditolak' }

  const { requestId, entityId, entityType, action, note } = parsed.data
  const result = await applyVerification(user.id, {
    requestId,
    entityId,
    entityType,
    action,
    note,
  })
  if (result.error) return result
  revalidatePath('/admin/verification')
  return { success: true }
}

// ── Bulk verification (re-verifikasi massal / review ulang) ─
// action 'approved' → verified, 'rejected' → rejected,
// 'reopen' → kembali ke pending (untuk re-verifikasi ulang).

async function applyVerification(
  actorId: string,
  input: {
    requestId: string
    entityId: string
    entityType: 'company' | 'recycler'
    action: 'approved' | 'rejected' | 'reopen'
    note?: string
  },
): Promise<ActionResult> {
  const admin = createAdminClient()
  const { requestId, entityId, entityType, action, note } = input

  const newStatus =
    action === 'approved' ? 'verified' : action === 'rejected' ? 'rejected' : 'pending'

  const isReopen = action === 'reopen'

  // Update verification_requests
  const { error: vrError } = await admin
    .from('verification_requests')
    .update({
      status: newStatus,
      reviewed_by: isReopen ? null : actorId,
      reviewed_at: isReopen ? null : new Date().toISOString(),
      note: isReopen ? null : (note ?? null),
    })
    .eq('id', requestId)

  if (vrError) return { error: vrError.message }

  // Update entity verification_status
  const table = entityType === 'company' ? 'companies' : 'recyclers'
  const { data: oldEntity } = await admin
    .from(table)
    .select('verification_status')
    .eq('id', entityId)
    .single()

  const { error: entityError } = await admin
    .from(table)
    .update({ verification_status: newStatus })
    .eq('id', entityId)

  if (entityError) return { error: entityError.message }

  // Update the linked profile too
  await admin
    .from('profiles')
    .update({ verification_status: newStatus })
    .eq(entityType === 'company' ? 'company_id' : 'recycler_id', entityId)

  await writeAuditLog(
    actorId,
    isReopen ? 'verification.reopened' : `verification.${action}`,
    entityType,
    entityId,
    { verification_status: oldEntity?.verification_status },
    { verification_status: newStatus, note: isReopen ? undefined : note },
  )

  return { success: true }
}

export async function bulkVerifyEntities(
  input: BulkVerifyEntitiesInput,
): Promise<ActionResult> {
  const parsed = bulkVerifyEntitiesSchema.safeParse(input)
  if (!parsed.success) return { error: firstZodError(parsed.error) }

  const { user, error: authError } = await requireAdmin()
  if (authError || !user) return { error: authError ?? 'Akses ditolak' }

  const { items, action, note } = parsed.data
  const results = await Promise.all(
    items.map((item) => applyVerification(user.id, { ...item, action, note })),
  )
  const failures = results.filter((r) => r.error)
  if (failures.length > 0) {
    return {
      error: `${failures.length} item gagal diproses: ${failures[0]?.error ?? ''}`,
      success: false,
    }
  }

  revalidatePath('/admin/verification')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

// ── Export data kepatuhan (CSV) ────────────────────────────

function escapeCsv(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

export async function exportComplianceData(): Promise<
  ActionResult & { csv?: string }
> {
  const { user, error: authError } = await requireAdmin()
  if (authError || !user) return { error: authError ?? 'Akses ditolak' }

  const admin = createAdminClient()

  const [{ data: companies }, { data: recyclers }, { data: auditLog }] =
    await Promise.all([
      admin
        .from('companies')
        .select('id, name, industry, npwp, verification_status, created_at')
        .order('created_at', { ascending: false }),
      admin
        .from('recyclers')
        .select('id, name, address, capacity_kg_per_month, verification_status, created_at')
        .order('created_at', { ascending: false }),
      admin
        .from('audit_log')
        .select('created_at, actor_id, action, entity_type, entity_id')
        .order('created_at', { ascending: false })
        .limit(1000),
    ])

  const rows: string[] = []

  // 1) Perusahaan
  rows.push('ENTITAS: PERUSAHAAN')
  rows.push(
    ['ID', 'Nama', 'Industri', 'NPWP', 'Status Verifikasi', 'Dibuat'].map(escapeCsv).join(','),
  )
  for (const c of companies ?? []) {
    rows.push(
      [c.id, c.name, c.industry, c.npwp, c.verification_status, c.created_at]
        .map(escapeCsv)
        .join(','),
    )
  }
  rows.push('')

  // 2) Recycler
  rows.push('ENTITAS: RECYCLER')
  rows.push(
    ['ID', 'Nama', 'Alamat', 'Kapasitas (kg/bulan)', 'Status Verifikasi', 'Dibuat'].map(escapeCsv).join(','),
  )
  for (const r of recyclers ?? []) {
    rows.push(
      [
        r.id,
        r.name,
        r.address,
        r.capacity_kg_per_month,
        r.verification_status,
        r.created_at,
      ]
        .map(escapeCsv)
        .join(','),
    )
  }
  rows.push('')

  // 3) Audit log
  rows.push('AUDIT LOG (1000 terbaru)')
  rows.push(
    ['Waktu', 'Aktor', 'Aksi', 'Tipe Entitas', 'Entitas ID'].map(escapeCsv).join(','),
  )
  for (const a of auditLog ?? []) {
    rows.push(
      [a.created_at, a.actor_id, a.action, a.entity_type, a.entity_id]
        .map(escapeCsv)
        .join(','),
    )
  }

  return { success: true, csv: rows.join('\n') }
}

// ============================================================
// REGULATIONS
// ============================================================

export async function createRegulation(
  input: CreateRegulationInput,
  file?: File,
): Promise<ActionResult> {
  const parsed = createRegulationSchema.safeParse(input)
  if (!parsed.success) return { error: firstZodError(parsed.error) }

  const { user, error: authError } = await requireAdmin()
  if (authError || !user) return { error: authError ?? 'Akses ditolak' }

  const supabase = await createClient()
  let filePath: string | null = null
  let fileName: string | null = null
  let fileSize: number | null = null

  // Upload file if provided
  if (file && file.size > 0) {
    const ext = file.name.split('.').pop()
    const storagePath = `${user.id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('regulation-docs')
      .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) return { error: `Upload gagal: ${uploadError.message}` }

    filePath = storagePath
    fileName = file.name
    fileSize = file.size
    void ext // used in path
  }

  const { data: reg, error: insertError } = await supabase
    .from('regulations')
    .insert({
      ...parsed.data,
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      uploaded_by: user.id,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  await writeAuditLog(user.id, 'regulation.created', 'regulation', reg.id, undefined, {
    title: parsed.data.title,
    category: parsed.data.category,
  })

  revalidatePath('/admin/regulations')
  return { success: true }
}

export async function updateRegulation(input: UpdateRegulationInput): Promise<ActionResult> {
  const parsed = updateRegulationSchema.safeParse(input)
  if (!parsed.success) return { error: firstZodError(parsed.error) }

  const { user, error: authError } = await requireAdmin()
  if (authError || !user) return { error: authError ?? 'Akses ditolak' }

  const supabase = await createClient()
  const { id, ...updates } = parsed.data

  const { data: old } = await supabase
    .from('regulations')
    .select('title, status, version')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('regulations')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  await writeAuditLog(user.id, 'regulation.updated', 'regulation', id, old ?? undefined, updates)

  revalidatePath('/admin/regulations')
  return { success: true }
}

export async function archiveRegulation(id: string): Promise<ActionResult> {
  return updateRegulation({ id, status: 'archived' })
}

// ============================================================
// EMISSION FACTORS — REMOVED (v2 uses RAG-based carbon)
// These functions are kept as stubs to avoid import errors
// Admin carbon config now manages carbon_docs instead
// ============================================================

export async function createEmissionFactor(): Promise<ActionResult> {
  return { error: 'Emission factors tidak lagi digunakan. Gunakan Carbon Reference Docs.' }
}

export async function updateEmissionFactor(): Promise<ActionResult> {
  return { error: 'Emission factors tidak lagi digunakan.' }
}

export async function deactivateEmissionFactor(): Promise<ActionResult> {
  return { error: 'Emission factors tidak lagi digunakan.' }
}
