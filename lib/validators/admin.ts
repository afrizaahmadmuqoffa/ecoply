import { z } from 'zod'

// ── Verification ───────────────────────────────────────────

export const verifyEntitySchema = z.object({
  requestId: z.string().uuid(),
  entityId: z.string().uuid(),
  entityType: z.enum(['company', 'recycler']),
  action: z.enum(['approved', 'rejected']),
  note: z.string().max(500).optional(),
})

// ── Bulk verification (re-verifikasi massal) ───────────────

export const bulkVerifyEntitySchema = z.object({
  requestId: z.string().uuid(),
  entityId: z.string().uuid(),
  entityType: z.enum(['company', 'recycler']),
})

export const bulkVerifyEntitiesSchema = z.object({
  items: z.array(bulkVerifyEntitySchema).min(1, 'Pilih minimal 1 entitas'),
  action: z.enum(['approved', 'rejected', 'reopen']),
  note: z.string().max(500).optional(),
})

export type BulkVerifyEntitiesInput = z.infer<typeof bulkVerifyEntitiesSchema>

// ── Regulations ────────────────────────────────────────────

export const createRegulationSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['OJK', 'KLHK', 'BPJS', 'ISO', 'GRI', 'TCFD', 'ISSB', 'Lainnya']),
  version: z.string().min(1).max(20).default('1.0'),
})

export const updateRegulationSchema = createRegulationSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['active', 'archived']).optional(),
  version: z.string().min(1).max(20).optional(),
})

// ── Emission Factors ───────────────────────────────────────

// ── Gas breakdown for emission factor ─────────────────────

export const emissionFactorGasSchema = z.object({
  gas_name: z.string().min(1, 'Nama gas wajib diisi'),      // 'CO2', 'CH4', 'R-410A', etc.
  gas_type: z.enum(['CO2', 'CH4', 'N2O', 'HFC', 'PFC', 'SF6', 'NF3']),
  factor_value: z.coerce.number().nonnegative('Nilai tidak boleh negatif'),
  gwp_snapshot: z.coerce.number().positive('GWP harus positif').optional(),
  source_note: z.string().max(200).optional(),
})

export const createEmissionFactorSchema = z.object({
  scope: z.enum(['scope1', 'scope2', 'scope3']),
  category: z.string().min(2, 'Kategori wajib diisi').max(200),
  unit: z.string().min(1, 'Satuan wajib diisi').max(50),
  factor_unit: z.string().default('kgCO2e'),
  // Scope 1
  subcategory: z.enum([
    'stationary_combustion',
    'mobile_combustion',
    'fugitive_emissions',
    'process_emissions',
  ]).optional(),
  material_type: z.string().max(100).optional(),
  // Scope 2
  region: z.string().max(100).optional(),
  energy_provider: z.string().max(100).optional(),
  scope2_method: z.enum(['location_based', 'market_based']).optional(),
  // Scope 3
  scope3_method: z.enum(['activity_based', 'spend_based']).optional(),
  // Common
  gwp_basis: z.enum(['AR4', 'AR5', 'AR6']).optional(),
  source: z.string().max(200).optional(),
  source_url: z.string().url('URL tidak valid').optional().or(z.literal('')),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  year_reference: z.coerce.number().int().min(2000).max(2100).optional(),
  // Gas breakdown — required, at least one gas
  gases: z.array(emissionFactorGasSchema).min(1, 'Minimal satu gas harus diisi'),
})

export const updateEmissionFactorSchema = createEmissionFactorSchema.partial().extend({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
})

export type VerifyEntityInput = z.infer<typeof verifyEntitySchema>
export type CreateRegulationInput = z.infer<typeof createRegulationSchema>
export type UpdateRegulationInput = z.infer<typeof updateRegulationSchema>
export type EmissionFactorGasInput = z.infer<typeof emissionFactorGasSchema>
export type CreateEmissionFactorInput = z.infer<typeof createEmissionFactorSchema>
export type UpdateEmissionFactorInput = z.infer<typeof updateEmissionFactorSchema>
