'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import type { Json } from '@/types/supabase'
import {
  calcCombustion,
  calcVehicle,
  calcFugitiveTopUp,
  calcFugitiveScreening,
  calcEnergy,
  calcS3C1AverageData,
  calcS3C1SpendBased,
  calcS3C1SupplierSpecific,
} from '@/lib/carbon/calculator'

// ── Types ────────────────────────────────────────────────

type R = { error?: string; success?: boolean; saved?: number; skipped?: number; errors?: string[] }

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, companyId: null }
  const { data: p } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!p || p.role !== 'company') return { supabase, user, companyId: null }
  return { supabase, user, companyId: p.company_id }
}

// ── Coerce helpers ───────────────────────────────────────
// Gemini sering return null padahal kita expect string/undefined.
// Pakai .nullish() + .transform() agar toleran.

const safeString = z.string().nullish().transform(v => v ?? '')
const optString = z.string().nullish().transform(v => v ?? undefined)
const optNumber = z.number().nullish().transform(v => v ?? undefined)

// ── Schema ───────────────────────────────────────────────

const extractedEntrySchema = z.object({
  scope: z.enum([
    'scope1_stationary',
    'scope1_mobile_fuel',
    'scope1_vehicle',
    'scope1_fugitive',
    'scope2',
    'scope3c1',
  ]),
  description: safeString,
  quantity: z.number().positive(),
  unit: safeString,
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format harus YYYY-MM-DD'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format harus YYYY-MM-DD'),
  ef_id: z.string().uuid().nullish().transform(v => v ?? null),
  ef_matched: z.boolean().default(false),
  ef_suggestion: safeString,
  source_excerpt: optString,
  confidence: z.number().min(0).max(1).default(0.5),

  // Scope-specific fields — ALL nullable
  fuel_name: optString,
  vehicle_type: optString,
  region_name: optString,
  energy_type: optString,
  refrigerant_name: optString,
  gas_type: optString,
  method: z.enum([
    'top_up', 'screening',
    'supplier_specific', 'average_data', 'spend_based',
  ]).nullish().transform(v => v ?? undefined),
  gwp_value: optNumber,
  currency: optString,
  mass_refilled_kg: optNumber,
  asset_category_name: optString,
  total_capacity_kg: optNumber,
  leakage_rate: optNumber,
  supplier_name: optString,
  product_name: optString,
  supplier_ef_kg_co2e_per_unit: optNumber,
  material_name: optString,
  sector_name: optString,
})

export type ExtractedEntryInput = z.input<typeof extractedEntrySchema>
export type ExtractedEntry = z.output<typeof extractedEntrySchema>

const saveExtractionSchema = z.object({
  entries: z.array(extractedEntrySchema).min(1, 'Minimal 1 entry'),
})

// ── Period helpers ───────────────────────────────────────
// Seragamkan periode selalu 1 bulan penuh (bulan dari period_end).
// Entri AI yang membentang lintas bulan dipatok pada bulan period_end.

function normalizePeriod<T extends { period_start: string; period_end: string }>(entry: T): T {
  const year = Number(entry.period_end.slice(0, 4))
  const month = Number(entry.period_end.slice(5, 7))
  return {
    ...entry,
    period_start: `${entry.period_end.slice(0, 7)}-01`,
    period_end: new Date(year, month, 0).toISOString().slice(0, 10),
  }
}

async function assertExtractionNoConflict(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  entry: ExtractPeriodFields,
): Promise<void> {
  const scopeMap: Record<string, { table: string; scopeCategory?: string }> = {
    scope1_stationary: { table: 'ca_combustion', scopeCategory: 'stationary' },
    scope1_mobile_fuel: { table: 'ca_combustion', scopeCategory: 'mobile' },
    scope1_vehicle: { table: 'ca_vehicle' },
    scope1_fugitive: { table: 'ca_fugitive' },
    scope2: { table: 'ca_energy' },
    scope3c1: { table: 'ca_s3c1' },
  }
  const target = scopeMap[entry.scope]
  if (!target) return

  let query = admin
    .from(target.table as 'ca_combustion')
    .select('id')
    .eq('company_id', companyId)
    .in('status', ['draft', 'confirmed'])
    .gte('period_start', entry.period_start)
    .lte('period_start', entry.period_end)
  if (target.scopeCategory) query = query.eq('scope_category', target.scopeCategory)

  const { data } = await query.maybeSingle()
  if (data) {
    const monthLabel = new Date(`${entry.period_end.slice(0, 7)}-01`).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    })
    throw new Error(`Duplikat: aktivitas ini sudah tercatat untuk ${monthLabel}`)
  }
}

type ExtractPeriodFields = Pick<ExtractedEntry, 'scope' | 'period_start' | 'period_end'>

// ── Main Save Function ───────────────────────────────────

export async function saveExtractionDrafts(
  input: { entries: ExtractedEntryInput[] }
): Promise<R> {
  const parsed = saveExtractionSchema.safeParse(input)
  if (!parsed.success) {
    const detail = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
    return { error: `Validasi gagal: ${detail}` }
  }

  const { user, companyId } = await getContext()
  if (!user || !companyId) return { error: 'Tidak terautentikasi' }

  const admin = createAdminClient()
  const errors: string[] = []
  let saved = 0
  let skipped = 0

  const entries = parsed.data.entries
  const CONCURRENCY = 5
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const chunk = entries.slice(i, i + CONCURRENCY)
    await Promise.all(
      chunk.map(async (rawEntry) => {
        try {
          const entry = normalizePeriod(rawEntry)
          await saveSingleEntry(admin, user.id, companyId, entry)
          saved++
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          errors.push(`${rawEntry.description || 'entry'}: ${msg}`)
          skipped++
        }
      }),
    )
  }

  revalidatePath('/company/carbon')

  if (saved === 0 && skipped > 0) {
    return { error: `Tidak ada yang tersimpan: ${errors.join('; ')}`, saved, skipped, errors }
  }

  return { success: true, saved, skipped, errors: errors.length > 0 ? errors : undefined }
}

// ── Per-Entry Dispatcher ─────────────────────────────────

async function saveSingleEntry(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  companyId: string,
  entry: ExtractedEntry,
) {
  await assertExtractionNoConflict(admin, companyId, entry)

  const baseSnapshot = {
    extraction_meta: {
      source_excerpt: entry.source_excerpt ?? null,
      confidence: entry.confidence,
      ef_matched: entry.ef_matched,
      ef_suggestion: entry.ef_suggestion,
      description: entry.description,
    },
  }

  switch (entry.scope) {
    case 'scope1_stationary':
      return saveCombustion(admin, userId, companyId, entry, 'stationary', baseSnapshot)
    case 'scope1_mobile_fuel':
      return saveCombustion(admin, userId, companyId, entry, 'mobile', baseSnapshot)
    case 'scope1_vehicle':
      return saveVehicle(admin, userId, companyId, entry, baseSnapshot)
    case 'scope1_fugitive':
      return saveFugitive(admin, userId, companyId, entry, baseSnapshot)
    case 'scope2':
      return saveEnergy(admin, userId, companyId, entry, baseSnapshot)
    case 'scope3c1':
      return saveS3C1(admin, userId, companyId, entry, baseSnapshot)
    default:
      throw new Error(`Scope tidak dikenali: ${entry.scope}`)
  }
}

// ── Combustion (Stationary & Mobile) ─────────────────────

async function saveCombustion(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  companyId: string,
  entry: ExtractedEntry,
  scopeCategory: 'stationary' | 'mobile',
  baseSnapshot: Record<string, unknown>,
) {
  let factor = null
  if (entry.ef_id) {
    const { data } = await admin
      .from('ef_combustion')
      .select('*')
      .eq('id', entry.ef_id)
      .eq('is_active', true)
      .single()
    factor = data
  }

  const calcResult = factor ? calcCombustion(entry.quantity, factor) : null
  const fuelName = factor?.fuel_name ?? entry.fuel_name ?? 'Unknown'
  const unit = factor?.unit ?? entry.unit

  const snapshot = {
    ...baseSnapshot,
    fuel_name: fuelName,
    unit,
    ef_scope1_co2e: factor?.ef_scope1_co2e ?? 0,
    ef_outside_scope_co2e: factor?.ef_outside_scope_co2e ?? 0,
    is_fossil: factor?.is_fossil ?? true,
    source: factor?.source ?? null,
    year_reference: factor?.year_reference ?? null,
    formula: calcResult
      ? `${entry.quantity} ${unit} × ${factor!.ef_scope1_co2e} = ${calcResult.emission_scope1_co2e.toFixed(6)} kg CO₂e (Scope 1)`
      : 'Pending — emission factor belum dipilih',
  }

  const { error } = await admin.from('ca_combustion').insert({
    company_id: companyId,
    submitted_by: userId,
    scope_category: scopeCategory,
    ef_combustion_id: factor?.id ?? null,
    fuel_name: fuelName,
    unit,
    quantity: entry.quantity,
    period_start: entry.period_start,
    period_end: entry.period_end,
    notes: entry.source_excerpt ?? null,
    emission_scope1_co2e: calcResult?.emission_scope1_co2e ?? 0,
    emission_outside_scope_co2e: calcResult?.emission_outside_scope_co2e ?? 0,
    ef_snapshot: snapshot as unknown as Json,
    status: 'draft',
  })

  if (error) throw new Error(`Combustion: ${error.message}`)
}

// ── Vehicle ──────────────────────────────────────────────

async function saveVehicle(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  companyId: string,
  entry: ExtractedEntry,
  baseSnapshot: Record<string, unknown>,
) {
  let factor = null
  if (entry.ef_id) {
    const { data } = await admin
      .from('ef_vehicle')
      .select('*')
      .eq('id', entry.ef_id)
      .eq('is_active', true)
      .single()
    factor = data
  }

  const calcResult = factor
    ? calcVehicle(entry.quantity, {
        ...factor,
        unit: factor.unit as 'km' | 'mile',
      })
    : null
  const vehicleType = factor?.vehicle_type ?? entry.vehicle_type ?? 'Unknown'
  const unit = factor?.unit ?? entry.unit ?? 'km'

  const snapshot = {
    ...baseSnapshot,
    vehicle_type: vehicleType,
    unit,
    ef_co2e: factor?.ef_co2e ?? 0,
    source: factor?.source ?? null,
    year_reference: factor?.year_reference ?? null,
    formula: calcResult
      ? `${entry.quantity} ${unit} × ${factor!.ef_co2e} = ${calcResult.emission_co2e.toFixed(6)} kg CO₂e`
      : 'Pending — emission factor belum dipilih',
  }

  const { error } = await admin.from('ca_vehicle').insert({
    company_id: companyId,
    submitted_by: userId,
    ef_vehicle_id: factor?.id ?? null,
    vehicle_type: vehicleType,
    unit: unit as 'km' | 'mile',
    distance: entry.quantity,
    period_start: entry.period_start,
    period_end: entry.period_end,
    notes: entry.source_excerpt ?? null,
    emission_co2e: calcResult?.emission_co2e ?? 0,
    ef_snapshot: snapshot as unknown as Json,
    status: 'draft',
  })

  if (error) throw new Error(`Vehicle: ${error.message}`)
}

// ── Fugitive ─────────────────────────────────────────────

async function saveFugitive(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  companyId: string,
  entry: ExtractedEntry,
  baseSnapshot: Record<string, unknown>,
) {
  const method = entry.method === 'screening' ? 'screening' : 'top_up'
  const refrigerantName = entry.refrigerant_name ?? 'Unknown'
  const gwp = entry.gwp_value ?? 0

  // Coba fetch GWP dari master jika ef_id ada
  let actualGwp = gwp
  if (entry.ef_id) {
    const { data } = await admin
      .from('refrigerant_gwp')
      .select('gwp_value')
      .eq('id', entry.ef_id)
      .eq('is_active', true)
      .single()
    if (data) actualGwp = data.gwp_value
  }

  if (method === 'top_up') {
    const mass = entry.mass_refilled_kg ?? entry.quantity
    const calcResult = calcFugitiveTopUp(mass, actualGwp, refrigerantName)

    const snapshot = {
      ...baseSnapshot,
      method: 'top_up',
      refrigerant_name: refrigerantName,
      mass_refilled_kg: mass,
      gwp: actualGwp,
      formula: calcResult.ef_snapshot.formula,
    }

    const { error } = await admin.from('ca_fugitive').insert({
      company_id: companyId,
      submitted_by: userId,
      method: 'top_up',
      refrigerant_name: refrigerantName,
      refrigerant_gwp_id: entry.ef_id ?? null,
      gwp_value: actualGwp,
      mass_refilled_kg: mass,
      asset_category_id: null,
      asset_category_name: null,
      total_capacity_kg: null,
      leakage_rate: null,
      estimated_leakage_kg: calcResult.estimated_leakage_kg,
      emission_co2e: calcResult.emission_co2e,
      period_start: entry.period_start,
      period_end: entry.period_end,
      notes: entry.source_excerpt ?? null,
      ef_snapshot: snapshot as unknown as Json,
      status: 'draft',
    })

    if (error) throw new Error(`Fugitive: ${error.message}`)
  } else {
    const cap = entry.total_capacity_kg ?? 0
    const rate = entry.leakage_rate ?? 0.05
    const calcResult = calcFugitiveScreening(cap, rate, actualGwp, refrigerantName, entry.asset_category_name ?? '')

    const snapshot = {
      ...baseSnapshot,
      method: 'screening',
      asset_category: entry.asset_category_name ?? '',
      refrigerant: refrigerantName,
      total_capacity_kg: cap,
      leakage_rate: rate,
      gwp: actualGwp,
      formula: calcResult.ef_snapshot.formula,
    }

    const { error } = await admin.from('ca_fugitive').insert({
      company_id: companyId,
      submitted_by: userId,
      method: 'screening',
      refrigerant_name: refrigerantName,
      refrigerant_gwp_id: entry.ef_id ?? null,
      gwp_value: actualGwp,
      mass_refilled_kg: null,
      asset_category_id: null,
      asset_category_name: entry.asset_category_name ?? null,
      total_capacity_kg: cap,
      leakage_rate: rate,
      estimated_leakage_kg: calcResult.estimated_leakage_kg,
      emission_co2e: calcResult.emission_co2e,
      period_start: entry.period_start,
      period_end: entry.period_end,
      notes: entry.source_excerpt ?? null,
      ef_snapshot: snapshot as unknown as Json,
      status: 'draft',
    })

    if (error) throw new Error(`Fugitive screening: ${error.message}`)
  }
}

// ── Energy (Scope 2) ─────────────────────────────────────

async function saveEnergy(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  companyId: string,
  entry: ExtractedEntry,
  baseSnapshot: Record<string, unknown>,
) {
  let factor = null
  if (entry.ef_id) {
    const { data } = await admin
      .from('grid_emission_factors')
      .select('*')
      .eq('id', entry.ef_id)
      .eq('is_active', true)
      .single()
    factor = data
  }

  const energyType = (entry.energy_type === 'steam' ? 'steam' : 'electricity') as 'electricity' | 'steam'
  const calcResult = calcEnergy(entry.quantity, factor)
  const unit = factor?.unit ?? entry.unit ?? 'kWh'

  const snapshot = {
    ...baseSnapshot,
    region: factor?.region_name ?? entry.region_name ?? '',
    energy_type: factor?.energy_type ?? energyType,
    unit,
    ef_kg_co2e: factor?.ef_kg_co2e ?? 0,
    method: factor?.method ?? null,
    source: factor?.source ?? null,
    year_reference: factor?.year_reference ?? null,
    formula: calcResult.ef_snapshot.formula,
  }

  const { error } = await admin.from('ca_energy').insert({
    company_id: companyId,
    submitted_by: userId,
    energy_type: energyType,
    grid_ef_id: factor?.id ?? null,
    region_name: factor?.region_name ?? entry.region_name ?? null,
    unit: unit as 'kWh' | 'MWh' | 'MMBtu',
    consumption: entry.quantity,
    use_custom_ef: false,
    custom_ef_kg_co2e: null,
    emission_co2e: calcResult.emission_co2e,
    ef_snapshot: snapshot as unknown as Json,
    period_start: entry.period_start,
    period_end: entry.period_end,
    notes: entry.source_excerpt ?? null,
    status: 'draft',
  })

  if (error) throw new Error(`Energy: ${error.message}`)
}

// ── Scope 3 Cat 1 ────────────────────────────────────────

// ── Scope 3 Cat 1 ────────────────────────────────────────

async function saveS3C1(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  companyId: string,
  entry: ExtractedEntry,
  baseSnapshot: Record<string, unknown>,
) {
  const method = entry.method ?? 'average_data'

  let emissionCo2e = 0
  let efSnapshot: Record<string, unknown> = { ...baseSnapshot, pending: true }

  // Build insert payload per method — typed explicitly
  let insertPayload: {
    method: 'supplier_specific' | 'average_data' | 'spend_based'
    ef_average_id: string | null
    ef_spend_id: string | null
    supplier_name: string | null
    product_name: string | null
    supplier_ef_kg_co2e_per_unit: number | null
    material_name: string | null
    sector_name: string | null
    currency: string | null
    unit: string
  }

  if (method === 'average_data') {
    let factor = null
    if (entry.ef_id) {
      const { data } = await admin
        .from('s3c1_average_factors')
        .select('*')
        .eq('id', entry.ef_id)
        .eq('is_active', true)
        .single()
      factor = data
    }

    if (factor) {
      const calc = calcS3C1AverageData(entry.quantity, factor)
      emissionCo2e = calc.emission_co2e
      efSnapshot = { ...baseSnapshot, ...calc.ef_snapshot }
    }

    insertPayload = {
      method: 'average_data',
      ef_average_id: factor?.id ?? null,
      ef_spend_id: null,
      supplier_name: null,
      product_name: null,
      supplier_ef_kg_co2e_per_unit: null,
      material_name: factor?.material_name ?? entry.material_name ?? 'Unknown',
      sector_name: null,
      currency: null,
      unit: factor?.unit ?? entry.unit,
    }
  } else if (method === 'spend_based') {
    let factor = null
    if (entry.ef_id) {
      const { data } = await admin
        .from('s3c1_spend_factors')
        .select('*')
        .eq('id', entry.ef_id)
        .eq('is_active', true)
        .single()
      factor = data
    }

    if (factor) {
      const calc = calcS3C1SpendBased(entry.quantity, factor.currency, factor)
      emissionCo2e = calc.emission_co2e
      efSnapshot = { ...baseSnapshot, ...calc.ef_snapshot }
    }

    insertPayload = {
      method: 'spend_based',
      ef_average_id: null,
      ef_spend_id: factor?.id ?? null,
      supplier_name: null,
      product_name: null,
      supplier_ef_kg_co2e_per_unit: null,
      material_name: null,
      sector_name: factor?.sector_name ?? entry.sector_name ?? 'Unknown',
      currency: factor?.currency ?? entry.currency ?? 'IDR',
      unit: factor?.currency ?? entry.currency ?? 'IDR',
    }
  } else {
    // supplier_specific
    const ef = entry.supplier_ef_kg_co2e_per_unit ?? 0
    if (ef > 0) {
      const calc = calcS3C1SupplierSpecific(
        entry.quantity,
        entry.unit,
        ef,
        entry.supplier_name ?? 'Unknown',
        entry.product_name ?? 'Unknown',
      )
      emissionCo2e = calc.emission_co2e
      efSnapshot = { ...baseSnapshot, ...calc.ef_snapshot }
    }

    insertPayload = {
      method: 'supplier_specific',
      ef_average_id: null,
      ef_spend_id: null,
      supplier_name: entry.supplier_name ?? 'Unknown',
      product_name: entry.product_name ?? 'Unknown',
      supplier_ef_kg_co2e_per_unit: ef,
      material_name: null,
      sector_name: null,
      currency: null,
      unit: entry.unit,
    }
  }

  const { error } = await admin.from('ca_s3c1').insert({
    company_id: companyId,
    submitted_by: userId,
    ...insertPayload,
    quantity: entry.quantity,
    emission_co2e: emissionCo2e,
    ef_snapshot: efSnapshot as unknown as Json,
    period_start: entry.period_start,
    period_end: entry.period_end,
    notes: entry.source_excerpt ?? null,
    status: 'draft',
  })

  if (error) throw new Error(`S3C1: ${error.message}`)
}