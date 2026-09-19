'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

type R = { error?: string; success?: boolean }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: 'Tidak terautentikasi' as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { supabase, user: null, error: 'Akses ditolak' as const }
  return { supabase, user, error: null }
}

function firstErr(e: { issues: Array<{ message: string }> }) {
  return e.issues[0]?.message ?? 'Input tidak valid'
}

// ── Helpers ───────────────────────────────────────────────

async function deactivate(table: string, id: string): Promise<R> {
  const { supabase, error: authErr } = await requireAdmin()
  if (authErr) return { error: authErr }
  const { error } = await supabase.from(table as 'ef_combustion').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

// ── Combustion Factors ────────────────────────────────────

const combustionSchema = z.object({
  scope_category: z.enum(['stationary', 'mobile']),
  fuel_name: z.string().min(1).max(100),
  unit: z.string().min(1).max(20),
  ef_scope1_co2e: z.coerce.number().nonnegative(),
  ef_outside_scope_co2e: z.coerce.number().nonnegative().default(0),
  ef_co2: z.coerce.number().nonnegative().optional(),
  ef_ch4: z.coerce.number().nonnegative().optional(),
  ef_n2o: z.coerce.number().nonnegative().optional(),
  is_fossil: z.boolean().default(true),
  source: z.string().max(200).optional(),
  year_reference: z.coerce.number().int().min(2000).max(2100).optional(),
})

export async function createCombustionFactor(input: z.infer<typeof combustionSchema>): Promise<R> {
  const p = combustionSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  const { error } = await supabase.from('ef_combustion').insert({ ...p.data, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateCombustionFactor(id: string): Promise<R> {
  return deactivate('ef_combustion', id)
}

// ── Vehicle Factors ───────────────────────────────────────

const vehicleSchema = z.object({
  vehicle_type: z.string().min(1).max(200),
  unit: z.enum(['km', 'mile']),
  ef_co2e: z.coerce.number().nonnegative(),
  ef_co2: z.coerce.number().nonnegative().optional(),
  ef_ch4: z.coerce.number().nonnegative().optional(),
  ef_n2o: z.coerce.number().nonnegative().optional(),
  source: z.string().max(200).optional(),
  year_reference: z.coerce.number().int().min(2000).max(2100).optional(),
})

export async function createVehicleFactor(input: z.infer<typeof vehicleSchema>): Promise<R> {
  const p = vehicleSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  const { error } = await supabase.from('ef_vehicle').insert({ ...p.data, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateVehicleFactor(id: string): Promise<R> {
  return deactivate('ef_vehicle', id)
}

// ── Refrigerant GWP ───────────────────────────────────────

const refrigerantSchema = z.object({
  refrigerant_name: z.string().min(1).max(50),
  gas_type: z.enum(['HFC', 'PFC', 'SF6', 'NF3', 'HCFC', 'Other']),
  gwp_value: z.coerce.number().positive(),
  source: z.string().max(200).optional(),
})

export async function createRefrigerantGwp(input: z.infer<typeof refrigerantSchema>): Promise<R> {
  const p = refrigerantSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  const { error } = await supabase.from('refrigerant_gwp').insert({ ...p.data, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateRefrigerantGwp(id: string): Promise<R> {
  return deactivate('refrigerant_gwp', id)
}

// ── Fugitive Asset Categories ─────────────────────────────

const fugitiveAssetSchema = z.object({
  category_name: z.string().min(1).max(200),
  annual_leakage_rate: z.coerce.number().min(0).max(1),
  typical_refrigerant: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  source: z.string().max(200).optional(),
})

export async function createFugitiveAssetCategory(input: z.infer<typeof fugitiveAssetSchema>): Promise<R> {
  const p = fugitiveAssetSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  const { error } = await supabase.from('fugitive_asset_categories').insert({ ...p.data, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateFugitiveAssetCategory(id: string): Promise<R> {
  return deactivate('fugitive_asset_categories', id)
}

// ── Grid Emission Factors ─────────────────────────────────

const gridSchema = z.object({
  region_name: z.string().min(1).max(200),
  energy_type: z.enum(['electricity', 'steam']),
  unit: z.enum(['kWh', 'MWh', 'MMBtu']),
  ef_kg_co2e: z.coerce.number().nonnegative(),
  method: z.enum(['location_based', 'market_based']).optional(),
  country: z.string().max(10).default('ID'),
  source: z.string().max(200).optional(),
  year_reference: z.coerce.number().int().min(2000).max(2100).optional(),
})

export async function createGridFactor(input: z.infer<typeof gridSchema>): Promise<R> {
  const p = gridSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  const { error } = await supabase.from('grid_emission_factors').insert({ ...p.data, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateGridFactor(id: string): Promise<R> {
  return deactivate('grid_emission_factors', id)
}

// ── S3C1 Average Factors ──────────────────────────────────

const s3c1AvgSchema = z.object({
  material_name: z.string().min(1).max(200),
  unit: z.string().min(1).max(20),
  ef_kg_co2e: z.coerce.number().nonnegative(),
  source: z.string().max(200).optional(),
  year_reference: z.coerce.number().int().min(2000).max(2100).optional(),
})

export async function createS3C1AverageFactor(input: z.infer<typeof s3c1AvgSchema>): Promise<R> {
  const p = s3c1AvgSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  const { error } = await supabase.from('s3c1_average_factors').insert({ ...p.data, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateS3C1AverageFactor(id: string): Promise<R> {
  return deactivate('s3c1_average_factors', id)
}

// ── S3C1 Spend Factors ────────────────────────────────────

const s3c1SpendSchema = z.object({
  sector_name: z.string().min(1).max(200),
  currency: z.enum(['IDR', 'USD', 'EUR', 'GBP']),
  ef_kg_co2e: z.coerce.number().nonnegative(),
  eeio_database: z.string().max(100).optional(),
  year_reference: z.coerce.number().int().min(2000).max(2100).optional(),
})

export async function createS3C1SpendFactor(input: z.infer<typeof s3c1SpendSchema>): Promise<R> {
  const p = s3c1SpendSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  const { error } = await supabase.from('s3c1_spend_factors').insert({ ...p.data, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateS3C1SpendFactor(id: string): Promise<R> {
  return deactivate('s3c1_spend_factors', id)
}

// ── S3C2 Average Factors ──────────────────────────────────

const s3c2AvgSchema = z.object({
  material_name: z.string().min(1).max(200),
  unit: z.string().min(1).max(20),
  ef_kg_co2e: z.coerce.number().nonnegative(),
  source: z.string().max(200).optional(),
  year_reference: z.coerce.number().int().min(2000).max(2100).optional(),
})

export async function createS3C2AverageFactor(input: z.infer<typeof s3c2AvgSchema>): Promise<R> {
  const p = s3c2AvgSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  const { error } = await supabase.from('s3c2_average_factors').insert({ ...p.data, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateS3C2AverageFactor(id: string): Promise<R> {
  return deactivate('s3c2_average_factors', id)
}

// ── S3C2 Spend Factors ────────────────────────────────────

const s3c2SpendSchema = z.object({
  sector_name: z.string().min(1).max(200),
  currency: z.enum(['IDR', 'USD', 'EUR', 'GBP']),
  ef_kg_co2e: z.coerce.number().nonnegative(),
  eeio_database: z.string().max(100).optional(),
  year_reference: z.coerce.number().int().min(2000).max(2100).optional(),
})

export async function createS3C2SpendFactor(input: z.infer<typeof s3c2SpendSchema>): Promise<R> {
  const p = s3c2SpendSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  const { error } = await supabase.from('s3c2_spend_factors').insert({ ...p.data, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateS3C2SpendFactor(id: string): Promise<R> {
  return deactivate('s3c2_spend_factors', id)
}

// ── Recycling Avoided Factors ─────────────────────────────

const recyclingSchema = z.object({
  material_name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  unit: z.enum(['kg', 'tonne']).default('kg'),
  virgin_ef_kg_co2e: z.coerce.number().nonnegative(),
  recycled_ef_kg_co2e: z.coerce.number().nonnegative().default(0),
  source: z.string().max(200).optional(),
  year_reference: z.coerce.number().int().min(2000).max(2100).optional(),
}).refine((d) => d.virgin_ef_kg_co2e >= d.recycled_ef_kg_co2e, {
  message: 'EF virgin harus ≥ EF daur ulang',
  path: ['recycled_ef_kg_co2e'],
})

export async function createRecyclingFactor(input: z.input<typeof recyclingSchema>): Promise<R> {
  const p = recyclingSchema.safeParse(input)
  if (!p.success) return { error: firstErr(p.error) }
  const { supabase, user, error: authErr } = await requireAdmin()
  if (authErr || !user) return { error: authErr ?? 'Akses ditolak' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: e1 } = await (supabase as any).from('recycling_avoided_factors').insert({ ...p.data, created_by: user.id })
  if (e1) return { error: e1.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}

export async function deactivateRecyclingFactor(id: string): Promise<R> {
  return deactivate('recycling_avoided_factors', id)
}

// ── Generic Update (for all 9 tables) ────────────────────

const ALLOWED_TABLES = [
  'ef_combustion', 'ef_vehicle', 'refrigerant_gwp',
  'fugitive_asset_categories', 'grid_emission_factors',
  's3c1_average_factors', 's3c1_spend_factors',
  's3c2_average_factors', 's3c2_spend_factors',
  'recycling_avoided_factors',
] as const

type AllowedTable = typeof ALLOWED_TABLES[number]

// Whitelist of fields that can be updated per table
const UPDATABLE_FIELDS: Record<AllowedTable, string[]> = {
  ef_combustion:             ['fuel_name', 'unit', 'ef_scope1_co2e', 'ef_outside_scope_co2e', 'ef_co2', 'ef_ch4', 'ef_n2o', 'is_fossil', 'source', 'year_reference'],
  ef_vehicle:                ['vehicle_type', 'unit', 'ef_co2e', 'ef_co2', 'ef_ch4', 'ef_n2o', 'source', 'year_reference'],
  refrigerant_gwp:           ['refrigerant_name', 'gas_type', 'gwp_value', 'source'],
  fugitive_asset_categories: ['category_name', 'annual_leakage_rate', 'typical_refrigerant', 'notes', 'source'],
  grid_emission_factors:     ['region_name', 'energy_type', 'unit', 'ef_kg_co2e', 'method', 'country', 'source', 'year_reference'],
  s3c1_average_factors:      ['material_name', 'unit', 'ef_kg_co2e', 'source', 'year_reference'],
  s3c1_spend_factors:        ['sector_name', 'currency', 'ef_kg_co2e', 'eeio_database', 'year_reference'],
  s3c2_average_factors:      ['material_name', 'unit', 'ef_kg_co2e', 'source', 'year_reference'],
  s3c2_spend_factors:        ['sector_name', 'currency', 'ef_kg_co2e', 'eeio_database', 'year_reference'],
  recycling_avoided_factors: ['material_name', 'category', 'unit', 'virgin_ef_kg_co2e', 'recycled_ef_kg_co2e', 'source', 'year_reference'],
}

export async function updateCarbonMasterEntry(
  table: string,
  id: string,
  updates: Record<string, unknown>,
): Promise<R> {
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    return { error: `Tabel tidak diizinkan: ${table}` }
  }

  const { supabase, error: authErr } = await requireAdmin()
  if (authErr) return { error: authErr }

  // Filter to only allowed fields
  const allowedFields = UPDATABLE_FIELDS[table as AllowedTable]
  const safeUpdates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in updates) {
      safeUpdates[key] = updates[key]
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return { error: 'Tidak ada field valid untuk diupdate' }
  }

  const { error } = await supabase
    .from(table as 'ef_combustion')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(safeUpdates as any)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/carbon-config')
  return { success: true }
}
