/**
 * Deterministic carbon emission calculator.
 * Pure functions — no DB, no side effects.
 * All values in kg CO₂e.
 */

// ── Shared snapshot type ─────────────────────────────────
// ef_snapshot selalu punya formula + metadata tambahan
export type EfSnapshot = {
  formula: string
  [key: string]: unknown
}

// ── Scope 1: Combustion (Stationary & Mobile Fuel-Based) ──

export type CombustionFactor = {
  id: string
  fuel_name: string
  unit: string
  ef_scope1_co2e: number
  ef_outside_scope_co2e: number
  is_fossil: boolean
  source: string | null
  year_reference: number | null
}

export type CombustionResult = {
  emission_scope1_co2e: number
  emission_outside_scope_co2e: number
  ef_snapshot: EfSnapshot  // ← diubah dari object
}

export function calcCombustion(
  quantity: number,
  factor: CombustionFactor,
): CombustionResult {
  return {
    emission_scope1_co2e: quantity * factor.ef_scope1_co2e,
    emission_outside_scope_co2e: quantity * factor.ef_outside_scope_co2e,
    ef_snapshot: {
      fuel_name: factor.fuel_name,
      unit: factor.unit,
      ef_scope1_co2e: factor.ef_scope1_co2e,
      ef_outside_scope_co2e: factor.ef_outside_scope_co2e,
      is_fossil: factor.is_fossil,
      source: factor.source,
      year_reference: factor.year_reference,
      formula: `${quantity} ${factor.unit} × ${factor.ef_scope1_co2e} = ${(quantity * factor.ef_scope1_co2e).toFixed(6)} kg CO₂e (Scope 1)`,
    },
  }
}

// ── Scope 1: Mobile — Vehicle/Distance-Based ──────────────

export type VehicleFactor = {
  id: string
  vehicle_type: string
  unit: 'km' | 'mile'
  ef_co2e: number
  source: string | null
  year_reference: number | null
}

export function calcVehicle(
  distance: number,
  factor: VehicleFactor,
): { emission_co2e: number; ef_snapshot: EfSnapshot } {  // ← diubah
  const emission_co2e = distance * factor.ef_co2e
  return {
    emission_co2e,
    ef_snapshot: {
      vehicle_type: factor.vehicle_type,
      unit: factor.unit,
      ef_co2e: factor.ef_co2e,
      source: factor.source,
      year_reference: factor.year_reference,
      formula: `${distance} ${factor.unit} × ${factor.ef_co2e} = ${emission_co2e.toFixed(6)} kg CO₂e`,
    },
  }
}

// ── Scope 1: Fugitive — Top-Up Method ────────────────────

export function calcFugitiveTopUp(
  massRefilledKg: number,
  gwpValue: number,
  refrigerantName: string,
): { estimated_leakage_kg: number; emission_co2e: number; ef_snapshot: EfSnapshot } {  // ← diubah
  const emission_co2e = massRefilledKg * gwpValue
  return {
    estimated_leakage_kg: massRefilledKg,
    emission_co2e,
    ef_snapshot: {
      method: 'top_up',
      refrigerant: refrigerantName,
      mass_refilled_kg: massRefilledKg,
      gwp: gwpValue,
      formula: `${massRefilledKg} kg × GWP ${gwpValue} = ${emission_co2e.toFixed(4)} kg CO₂e`,
    },
  }
}

// ── Scope 1: Fugitive — Screening Method ─────────────────

export function calcFugitiveScreening(
  totalCapacityKg: number,
  leakageRate: number,
  gwpValue: number,
  refrigerantName: string,
  assetCategoryName: string,
): { estimated_leakage_kg: number; emission_co2e: number; ef_snapshot: EfSnapshot } {  // ← diubah
  const estimated_leakage_kg = totalCapacityKg * leakageRate
  const emission_co2e = estimated_leakage_kg * gwpValue
  return {
    estimated_leakage_kg,
    emission_co2e,
    ef_snapshot: {
      method: 'screening',
      asset_category: assetCategoryName,
      refrigerant: refrigerantName,
      total_capacity_kg: totalCapacityKg,
      leakage_rate_pct: (leakageRate * 100).toFixed(2) + '%',
      estimated_leakage_kg,
      gwp: gwpValue,
      formula: `${totalCapacityKg} kg × ${(leakageRate * 100).toFixed(2)}% × GWP ${gwpValue} = ${emission_co2e.toFixed(4)} kg CO₂e`,
    },
  }
}

// ── Scope 2: Energy Consumption ──────────────────────────

export type GridFactor = {
  id: string
  region_name: string
  energy_type: string
  unit: string
  ef_kg_co2e: number
  method: string | null
  source: string | null
  year_reference: number | null
}

export function calcEnergy(
  consumption: number,
  factor: GridFactor | null,
  customEfKgCo2e?: number,
): { emission_co2e: number; ef_snapshot: EfSnapshot; effective_ef: number } {  // ← diubah
  const ef = customEfKgCo2e ?? factor?.ef_kg_co2e ?? 0
  const emission_co2e = consumption * ef
  return {
    emission_co2e,
    effective_ef: ef,
    ef_snapshot: customEfKgCo2e
      ? { source: 'custom', ef_kg_co2e: customEfKgCo2e, formula: `${consumption} × ${ef} = ${emission_co2e.toFixed(6)} kg CO₂e` }
      : {
          region: factor?.region_name,
          energy_type: factor?.energy_type,
          unit: factor?.unit,
          ef_kg_co2e: ef,
          method: factor?.method,
          source: factor?.source,
          year_reference: factor?.year_reference,
          formula: `${consumption} ${factor?.unit} × ${ef} = ${emission_co2e.toFixed(6)} kg CO₂e`,
        },
  }
}

// ── Scope 3 Cat 1: Purchased Goods/Services ──────────────

export function calcS3C1SupplierSpecific(
  quantity: number,
  unit: string,
  supplierEfPerUnit: number,
  supplierName: string,
  productName: string,
): { emission_co2e: number; ef_snapshot: EfSnapshot } {  // ← diubah
  const emission_co2e = quantity * supplierEfPerUnit
  return {
    emission_co2e,
    ef_snapshot: {
      method: 'supplier_specific',
      supplier: supplierName,
      product: productName,
      ef_per_unit: supplierEfPerUnit,
      unit,
      formula: `${quantity} ${unit} × ${supplierEfPerUnit} kg CO₂e/${unit} = ${emission_co2e.toFixed(6)} kg CO₂e`,
    },
  }
}

export function calcS3C1AverageData(
  quantity: number,
  factor: { id: string; material_name: string; unit: string; ef_kg_co2e: number; source: string | null; year_reference: number | null },
): { emission_co2e: number; ef_snapshot: EfSnapshot } {  // ← diubah
  const emission_co2e = quantity * factor.ef_kg_co2e
  return {
    emission_co2e,
    ef_snapshot: {
      method: 'average_data',
      material: factor.material_name,
      unit: factor.unit,
      ef_kg_co2e: factor.ef_kg_co2e,
      source: factor.source,
      year_reference: factor.year_reference,
      formula: `${quantity} ${factor.unit} × ${factor.ef_kg_co2e} = ${emission_co2e.toFixed(6)} kg CO₂e`,
    },
  }
}

export function calcS3C1SpendBased(
  amount: number,
  currency: string,
  factor: { id: string; sector_name: string; currency: string; ef_kg_co2e: number; eeio_database: string | null; year_reference: number | null },
): { emission_co2e: number; ef_snapshot: EfSnapshot } {  // ← diubah
  const emission_co2e = amount * factor.ef_kg_co2e
  return {
    emission_co2e,
    ef_snapshot: {
      method: 'spend_based',
      sector: factor.sector_name,
      currency,
      ef_per_currency: factor.ef_kg_co2e,
      eeio_database: factor.eeio_database,
      year_reference: factor.year_reference,
      formula: `${amount} ${currency} × ${factor.ef_kg_co2e} = ${emission_co2e.toFixed(6)} kg CO₂e`,
    },
  }
}