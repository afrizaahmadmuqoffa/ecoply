"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  calcCombustion,
  calcVehicle,
  calcFugitiveTopUp,
  calcFugitiveScreening,
  calcEnergy,
  calcS3C1SupplierSpecific,
  calcS3C1AverageData,
  calcS3C1SpendBased,
} from "@/lib/carbon/calculator";
import type { Json } from "@/types/supabase";

type R = { error?: string; success?: boolean; id?: string };

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, companyId: null };
  const { data: p } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  if (!p || p.role !== "company") return { supabase, user, companyId: null };
  return { supabase, user, companyId: p.company_id };
}

const period = {
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
};

// ── Review helpers ────────────────────────────────────────

async function reviewEntry(
  table: string,
  id: string,
  action: "confirmed" | "rejected",
): Promise<R> {
  const { supabase, user, companyId } = await getContext();
  if (!user || !companyId) return { error: "Tidak terautentikasi" };
  const { error } = await supabase
    .from(table as "ca_combustion")
    .update({
      status: action,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true };
}

// ── Scope 1: Combustion ───────────────────────────────────

export async function assertNoPeriodConflict(
  table: string,
  periodStart: string,
  opts?: { excludeId?: string; scopeCategory?: string; label?: string },
): Promise<R | null> {
  const { supabase, user, companyId } = await getContext();
  if (!user || !companyId) return { error: "Tidak terautentikasi" };

  const year = periodStart.slice(0, 4);
  const month = periodStart.slice(5, 7);
  const start = `${year}-${month}-01`;
  const end = new Date(Number(year), Number(month), 0)
    .toISOString()
    .slice(0, 10);

  let query = supabase
    .from(table as "ca_combustion")
    .select("id")
    .eq("company_id", companyId)
    .in("status", ["draft", "confirmed"])
    .gte("period_start", start)
    .lte("period_start", end);
  if (opts?.excludeId) query = query.neq("id", opts.excludeId);
  if (opts?.scopeCategory) query = query.eq("scope_category", opts.scopeCategory);

  const { data } = await query.maybeSingle();
  if (data) {
    const monthLabel = new Date(`${year}-${month}-01`).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    return {
      error: opts?.label
        ? `Kamu sudah mencatat ${opts.label} untuk ${monthLabel}. Hapus entri lama atau pilih bulan lain.`
        : `Kamu sudah mencatat aktivitas ini untuk ${monthLabel}. Hapus entri lama atau pilih bulan lain.`,
    };
  }
  return null;
}

const combustionSchema = z.object({
  scope_category: z.enum(["stationary", "mobile"]),
  ef_combustion_id: z.string().uuid().optional(),
  fuel_name: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  period_start: z.string(),
  period_end: z.string(),
  notes: z.string().optional(),
});

export async function submitCombustion(
  input: z.infer<typeof combustionSchema>,
): Promise<R> {
  const p = combustionSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };

  const conflict = await assertNoPeriodConflict("ca_combustion", p.data.period_start, {
    scopeCategory: p.data.scope_category,
    label: "aktivitas pembakaran",
  });
  if (conflict) return conflict;

  const { supabase, user, companyId } = await getContext();
  if (!user || !companyId) return { error: "Tidak terautentikasi" };

  // Fetch emission factor
  let efData = null;
  if (p.data.ef_combustion_id) {
    const { data } = await supabase
      .from("ef_combustion")
      .select("*")
      .eq("id", p.data.ef_combustion_id)
      .single();
    efData = data;
  } else {
    const { data } = await supabase
      .from("ef_combustion")
      .select("*")
      .eq("scope_category", p.data.scope_category)
      .eq("fuel_name", p.data.fuel_name)
      .eq("unit", p.data.unit)
      .eq("is_active", true)
      .limit(1);
    efData = data?.[0] ?? null;
  }

  let calcResult = null;
  if (efData) calcResult = calcCombustion(p.data.quantity, efData);

  const { data, error } = await supabase
    .from("ca_combustion")
    .insert({
      company_id: companyId,
      submitted_by: user.id,
      scope_category: p.data.scope_category,
      ef_combustion_id: efData?.id ?? null,
      fuel_name: p.data.fuel_name,
      unit: p.data.unit,
      quantity: p.data.quantity,
      period_start: p.data.period_start,
      period_end: p.data.period_end,
      notes: p.data.notes ?? null,
      emission_scope1_co2e: calcResult?.emission_scope1_co2e ?? null,
      emission_outside_scope_co2e:
        calcResult?.emission_outside_scope_co2e ?? null,
      ef_snapshot: calcResult?.ef_snapshot
        ? (calcResult.ef_snapshot as unknown as Json)
        : null,
      status: "confirmed", // ✅ LANGSUNG CONFIRMED
      reviewed_by: user.id, // ✅ Submitter = reviewer
      reviewed_at: new Date().toISOString(), // ✅ Timestamp confirm
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true, id: data.id };
}

export async function reviewCombustion(
  id: string,
  action: "confirmed" | "rejected",
): Promise<R> {
  return reviewEntry("ca_combustion", id, action);
}

// ── Delete helpers (draft only) ──────────────────────────

export async function deleteCombustion(id: string): Promise<R> {
  const { supabase, companyId } = await getContext()
  if (!companyId) return { error: 'Tidak terautentikasi' }
  const { error } = await supabase
    .from('ca_combustion')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
    .eq('status', 'draft')
  if (error) return { error: error.message }
  revalidatePath('/company/carbon')
  return { success: true }
}

export async function deleteVehicle(id: string): Promise<R> {
  const { supabase, companyId } = await getContext()
  if (!companyId) return { error: 'Tidak terautentikasi' }
  const { error } = await supabase
    .from('ca_vehicle')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
    .eq('status', 'draft')
  if (error) return { error: error.message }
  revalidatePath('/company/carbon')
  return { success: true }
}

export async function deleteFugitive(id: string): Promise<R> {
  const { supabase, companyId } = await getContext()
  if (!companyId) return { error: 'Tidak terautentikasi' }
  const { error } = await supabase
    .from('ca_fugitive')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
    .eq('status', 'draft')
  if (error) return { error: error.message }
  revalidatePath('/company/carbon')
  return { success: true }
}

export async function deleteEnergy(id: string): Promise<R> {
  const { supabase, companyId } = await getContext()
  if (!companyId) return { error: 'Tidak terautentikasi' }
  const { error } = await supabase
    .from('ca_energy')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
    .eq('status', 'draft')
  if (error) return { error: error.message }
  revalidatePath('/company/carbon')
  return { success: true }
}

export async function deleteS3C1(id: string): Promise<R> {
  const { supabase, companyId } = await getContext()
  if (!companyId) return { error: 'Tidak terautentikasi' }
  const { error } = await supabase
    .from('ca_s3c1')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
    .eq('status', 'draft')
  if (error) return { error: error.message }
  revalidatePath('/company/carbon')
  return { success: true }
}

// ── Scope 1: Vehicle ──────────────────────────────────────

const vehicleSchema = z.object({
  ef_vehicle_id: z.string().uuid().optional(),
  vehicle_type: z.string().min(1),
  unit: z.enum(["km", "mile"]),
  distance: z.coerce.number().positive(),
  ...period,
  notes: z.string().optional(),
});

export async function submitVehicle(
  input: z.infer<typeof vehicleSchema>,
): Promise<R> {
  const p = vehicleSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };

  const conflict = await assertNoPeriodConflict("ca_vehicle", p.data.period_start, {
    label: "aktivitas kendaraan",
  });
  if (conflict) return conflict;

  const { supabase, user, companyId } = await getContext();
  if (!user || !companyId) return { error: "Tidak terautentikasi" };

  let efData = null;
  if (p.data.ef_vehicle_id) {
    const { data } = await supabase
      .from("ef_vehicle")
      .select("*")
      .eq("id", p.data.ef_vehicle_id)
      .single();
    efData = data;
  } else {
    const { data } = await supabase
      .from("ef_vehicle")
      .select("*")
      .eq("vehicle_type", p.data.vehicle_type)
      .eq("unit", p.data.unit)
      .eq("is_active", true)
      .limit(1);
    efData = data?.[0] ?? null;
  }

  const calcResult = efData
    ? calcVehicle(p.data.distance, {
        ...efData,
        unit: efData.unit as "km" | "mile",
      })
    : null;

  const { data, error } = await supabase
    .from("ca_vehicle")
    .insert({
      company_id: companyId,
      submitted_by: user.id,
      ef_vehicle_id: efData?.id ?? null,
      vehicle_type: p.data.vehicle_type,
      unit: p.data.unit,
      distance: p.data.distance,
      period_start: p.data.period_start,
      period_end: p.data.period_end,
      notes: p.data.notes ?? null,
      emission_co2e: calcResult?.emission_co2e ?? null,
      ef_snapshot: calcResult?.ef_snapshot
        ? (calcResult.ef_snapshot as unknown as Json)
        : null,
      status: "confirmed", // ✅
      reviewed_by: user.id, // ✅
      reviewed_at: new Date().toISOString(), // ✅
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true, id: data.id };
}

export async function reviewVehicle(
  id: string,
  action: "confirmed" | "rejected",
): Promise<R> {
  return reviewEntry("ca_vehicle", id, action);
}

// ── Scope 1: Fugitive ─────────────────────────────────────

const fugitiveSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("top_up"),
    refrigerant_name: z.string().min(1),
    refrigerant_gwp_id: z.string().uuid().optional(),
    gwp_value: z.coerce.number().positive(),
    mass_refilled_kg: z.coerce.number().positive(),
    ...period,
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("screening"),
    refrigerant_name: z.string().min(1),
    refrigerant_gwp_id: z.string().uuid().optional(),
    gwp_value: z.coerce.number().positive(),
    asset_category_id: z.string().uuid().optional(),
    asset_category_name: z.string().min(1),
    total_capacity_kg: z.coerce.number().positive(),
    leakage_rate: z.coerce.number().min(0).max(1),
    ...period,
    notes: z.string().optional(),
  }),
]);

export async function submitFugitive(
  input: z.infer<typeof fugitiveSchema>,
): Promise<R> {
  const p = fugitiveSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };

  const conflict = await assertNoPeriodConflict("ca_fugitive", p.data.period_start, {
    label: "emisi fugitif",
  });
  if (conflict) return conflict;

  const { supabase, user, companyId } = await getContext();
  if (!user || !companyId) return { error: "Tidak terautentikasi" };

  const d = p.data;
  let calcResult: ReturnType<typeof calcFugitiveTopUp>;

  if (d.method === "top_up") {
    calcResult = calcFugitiveTopUp(
      d.mass_refilled_kg,
      d.gwp_value,
      d.refrigerant_name,
    );
  } else {
    calcResult = calcFugitiveScreening(
      d.total_capacity_kg,
      d.leakage_rate,
      d.gwp_value,
      d.refrigerant_name,
      d.asset_category_name,
    );
  }

  const insertData = {
    company_id: companyId,
    submitted_by: user.id,
    method: d.method,
    refrigerant_name: d.refrigerant_name,
    refrigerant_gwp_id:
      "refrigerant_gwp_id" in d ? (d.refrigerant_gwp_id ?? null) : null,
    gwp_value: d.gwp_value,
    mass_refilled_kg: d.method === "top_up" ? d.mass_refilled_kg : null,
    asset_category_id:
      d.method === "screening" ? (d.asset_category_id ?? null) : null,
    asset_category_name:
      d.method === "screening" ? d.asset_category_name : null,
    total_capacity_kg: d.method === "screening" ? d.total_capacity_kg : null,
    leakage_rate: d.method === "screening" ? d.leakage_rate : null,
    estimated_leakage_kg: calcResult.estimated_leakage_kg,
    emission_co2e: calcResult.emission_co2e,
    period_start: d.period_start,
    period_end: d.period_end,
    notes: d.notes ?? null,
    ef_snapshot: calcResult.ef_snapshot as unknown as Json,
    status: "confirmed" as const, // ✅ UBAH dari 'draft'
    reviewed_by: user.id, // ✅ TAMBAH
    reviewed_at: new Date().toISOString(), // ✅ TAMBAH
  };

  const { data, error } = await supabase
    .from("ca_fugitive")
    .insert(insertData)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true, id: data.id };
}

export async function reviewFugitive(
  id: string,
  action: "confirmed" | "rejected",
): Promise<R> {
  return reviewEntry("ca_fugitive", id, action);
}

// ── Scope 2: Energy ───────────────────────────────────────

const energySchema = z.object({
  energy_type: z.enum(["electricity", "steam"]),
  grid_ef_id: z.string().uuid().optional(),
  region_name: z.string().optional(),
  unit: z.enum(["kWh", "MWh", "MMBtu"]),
  consumption: z.coerce.number().positive(),
  use_custom_ef: z.boolean().default(false),
  custom_ef_kg_co2e: z.coerce.number().nonnegative().optional(),
  ...period,
  notes: z.string().optional(),
});

export async function submitEnergy(
  input: z.infer<typeof energySchema>,
): Promise<R> {
  const p = energySchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };

  const conflict = await assertNoPeriodConflict("ca_energy", p.data.period_start, {
    label: "pemakaian energi",
  });
  if (conflict) return conflict;

  const { supabase, user, companyId } = await getContext();
  if (!user || !companyId) return { error: "Tidak terautentikasi" };

  let efData = null;
  if (p.data.grid_ef_id) {
    const { data } = await supabase
      .from("grid_emission_factors")
      .select("*")
      .eq("id", p.data.grid_ef_id)
      .single();
    efData = data;
  }

  const calcResult = calcEnergy(
    p.data.consumption,
    efData,
    p.data.use_custom_ef ? p.data.custom_ef_kg_co2e : undefined,
  );

  const { data, error } = await supabase
    .from("ca_energy")
    .insert({
      company_id: companyId,
      submitted_by: user.id,
      energy_type: p.data.energy_type,
      grid_ef_id: efData?.id ?? null,
      region_name: p.data.region_name ?? null,
      unit: p.data.unit,
      consumption: p.data.consumption,
      use_custom_ef: p.data.use_custom_ef,
      custom_ef_kg_co2e: p.data.custom_ef_kg_co2e ?? null,
      emission_co2e: calcResult.emission_co2e,
      ef_snapshot: calcResult.ef_snapshot as unknown as Json,
      period_start: p.data.period_start,
      period_end: p.data.period_end,
      notes: p.data.notes ?? null,
      status: "confirmed", // ✅
      reviewed_by: user.id, // ✅
      reviewed_at: new Date().toISOString(), // ✅
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true, id: data.id };
}

export async function reviewEnergy(
  id: string,
  action: "confirmed" | "rejected",
): Promise<R> {
  return reviewEntry("ca_energy", id, action);
}

// ── Scope 3 Cat 1 ─────────────────────────────────────────

// ── Scope 3 Cat 1 ─────────────────────────────────────────

const s3c1Schema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("supplier_specific"),
    supplier_name: z.string().min(1),
    product_name: z.string().min(1),
    supplier_ef_kg_co2e_per_unit: z.coerce.number().nonnegative(),
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1),
    ...period,
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("average_data"),
    ef_average_id: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1),
    ...period,
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("spend_based"),
    ef_spend_id: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    currency: z.string(),
    ...period,
    notes: z.string().optional(),
  }),
]);

export async function submitS3C1(
  input: z.infer<typeof s3c1Schema>,
): Promise<R> {
  const p = s3c1Schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };

  const conflict = await assertNoPeriodConflict("ca_s3c1", p.data.period_start, {
    label: "pembelian barang (Scope 3 Cat 1)",
  });
  if (conflict) return conflict;

  const { supabase, user, companyId } = await getContext();
  if (!user || !companyId) return { error: "Tidak terautentikasi" };

  const d = p.data;
  let calcResult: { emission_co2e: number; ef_snapshot: object };

  // Variables untuk simpan metadata faktor yang dipilih
  let materialName: string | null = null;
  let materialUnit: string | null = null;
  let sectorName: string | null = null;
  let spendCurrency: string | null = null;

  if (d.method === "supplier_specific") {
    calcResult = calcS3C1SupplierSpecific(
      d.quantity,
      d.unit,
      d.supplier_ef_kg_co2e_per_unit,
      d.supplier_name,
      d.product_name,
    );
  } else if (d.method === "average_data") {
    const { data: ef } = await supabase
      .from("s3c1_average_factors")
      .select("*")
      .eq("id", d.ef_average_id)
      .single();
    if (!ef) return { error: "Faktor emisi tidak ditemukan" };
    calcResult = calcS3C1AverageData(d.quantity, ef);
    // ✅ FIX: simpan material_name dan unit dari faktor
    materialName = ef.material_name;
    materialUnit = ef.unit;
  } else {
    const { data: ef } = await supabase
      .from("s3c1_spend_factors")
      .select("*")
      .eq("id", d.ef_spend_id)
      .single();
    if (!ef) return { error: "Faktor emisi tidak ditemukan" };
    calcResult = calcS3C1SpendBased(d.quantity, d.currency, ef);
    // ✅ FIX: simpan sector_name dan currency dari faktor
    sectorName = ef.sector_name;
    spendCurrency = ef.currency;
  }

  const insertData = {
    company_id: companyId,
    submitted_by: user.id,
    method: d.method,
    supplier_name: d.method === "supplier_specific" ? d.supplier_name : null,
    product_name: d.method === "supplier_specific" ? d.product_name : null,
    supplier_ef_kg_co2e_per_unit:
      d.method === "supplier_specific" ? d.supplier_ef_kg_co2e_per_unit : null,
    ef_average_id: d.method === "average_data" ? d.ef_average_id : null,
    material_name: materialName,
    ef_spend_id: d.method === "spend_based" ? d.ef_spend_id : null,
    sector_name: sectorName,
    currency: spendCurrency ?? (d.method === "spend_based" ? d.currency : null),
    quantity: d.quantity,
    unit:
      d.method === "spend_based"
        ? (spendCurrency ?? d.currency)
        : (materialUnit ?? d.unit),
    emission_co2e: calcResult.emission_co2e,
    ef_snapshot: calcResult.ef_snapshot as unknown as Json,
    period_start: d.period_start,
    period_end: d.period_end,
    notes: d.notes ?? null,
    status: "confirmed" as const, // ✅ UBAH dari 'draft'
    reviewed_by: user.id, // ✅ TAMBAH
    reviewed_at: new Date().toISOString(), // ✅ TAMBAH
  };

  const { data, error } = await supabase
    .from("ca_s3c1")
    .insert(insertData)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true, id: data.id };
}

export async function reviewS3C1(
  id: string,
  action: "confirmed" | "rejected",
): Promise<R> {
  return reviewEntry("ca_s3c1", id, action);
}

// ── Update Draft Actions ──────────────────────────────────
// Hanya bisa update entry dengan status='draft' milik company sendiri.
// Setiap update menghitung ulang emisi dari faktor baru yang dipilih.

// Update Combustion draft
const updateCombustionSchema = z.object({
  ef_combustion_id: z.string().uuid(),
  fuel_name: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

export async function updateCombustion(
  id: string,
  input: z.infer<typeof updateCombustionSchema>,
): Promise<R> {
  const p = updateCombustionSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };
  const { supabase, companyId } = await getContext();
  if (!companyId) return { error: "Tidak terautentikasi" };

  // Pastikan entry adalah draft milik company ini
  const { data: existing } = await supabase
    .from("ca_combustion")
    .select("scope_category, status")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (!existing) return { error: "Data tidak ditemukan" };
  if (existing.status !== "draft") return { error: "Hanya draft yang bisa diedit" };

  const conflict = await assertNoPeriodConflict("ca_combustion", p.data.period_start, {
    excludeId: id,
    scopeCategory: existing.scope_category,
    label: "aktivitas pembakaran",
  });
  if (conflict) return conflict;

  let efData = null;
  if (p.data.ef_combustion_id) {
    const { data } = await supabase
      .from("ef_combustion")
      .select("*")
      .eq("id", p.data.ef_combustion_id)
      .single();
    efData = data;
  } else {
    const { data } = await supabase
      .from("ef_combustion")
      .select("*")
      .eq("scope_category", existing.scope_category)
      .eq("fuel_name", p.data.fuel_name)
      .eq("unit", p.data.unit)
      .eq("is_active", true)
      .limit(1);
    efData = data?.[0] ?? null;
  }

  const calcResult = efData ? calcCombustion(p.data.quantity, efData) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ca_combustion")
    .update({
      ef_combustion_id: efData?.id ?? null,
      fuel_name: p.data.fuel_name,
      unit: p.data.unit,
      quantity: p.data.quantity,
      period_start: p.data.period_start,
      period_end: p.data.period_end,
      notes: p.data.notes ?? null,
      emission_scope1_co2e: calcResult?.emission_scope1_co2e ?? null,
      emission_outside_scope_co2e: calcResult?.emission_outside_scope_co2e ?? null,
      ef_snapshot: calcResult?.ef_snapshot
        ? (calcResult.ef_snapshot as unknown as Json)
        : null,
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true };
}

// Update Vehicle draft
const updateVehicleSchema = z.object({
  ef_vehicle_id: z.string().uuid(),
  vehicle_type: z.string().min(1),
  unit: z.enum(["km", "mile"]),
  distance: z.coerce.number().positive(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

export async function updateVehicle(
  id: string,
  input: z.infer<typeof updateVehicleSchema>,
): Promise<R> {
  const p = updateVehicleSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };
  const { supabase, companyId } = await getContext();
  if (!companyId) return { error: "Tidak terautentikasi" };

  const { data: existing } = await supabase
    .from("ca_vehicle")
    .select("status")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (!existing) return { error: "Data tidak ditemukan" };
  if (existing.status !== "draft") return { error: "Hanya draft yang bisa diedit" };

  const conflict = await assertNoPeriodConflict("ca_vehicle", p.data.period_start, {
    excludeId: id,
    label: "aktivitas kendaraan",
  });
  if (conflict) return conflict;

  let efData = null;
  if (p.data.ef_vehicle_id) {
    const { data } = await supabase
      .from("ef_vehicle")
      .select("*")
      .eq("id", p.data.ef_vehicle_id)
      .single();
    efData = data;
  } else {
    const { data } = await supabase
      .from("ef_vehicle")
      .select("*")
      .eq("vehicle_type", p.data.vehicle_type)
      .eq("unit", p.data.unit)
      .eq("is_active", true)
      .limit(1);
    efData = data?.[0] ?? null;
  }

  const calcResult = efData
    ? calcVehicle(p.data.distance, {
        ...efData,
        unit: efData.unit as "km" | "mile",
      })
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ca_vehicle")
    .update({
      ef_vehicle_id: efData?.id ?? null,
      vehicle_type: p.data.vehicle_type,
      unit: p.data.unit,
      distance: p.data.distance,
      period_start: p.data.period_start,
      period_end: p.data.period_end,
      notes: p.data.notes ?? null,
      emission_co2e: calcResult?.emission_co2e ?? null,
      ef_snapshot: calcResult?.ef_snapshot
        ? (calcResult.ef_snapshot as unknown as Json)
        : null,
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true };
}

// Update Fugitive draft
const updateFugitiveSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("top_up"),
    refrigerant_name: z.string().min(1),
    refrigerant_gwp_id: z.string().uuid().optional(),
    gwp_value: z.coerce.number().positive(),
    mass_refilled_kg: z.coerce.number().positive(),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("screening"),
    refrigerant_name: z.string().min(1),
    refrigerant_gwp_id: z.string().uuid().optional(),
    gwp_value: z.coerce.number().positive(),
    asset_category_id: z.string().uuid().optional(),
    asset_category_name: z.string().min(1),
    total_capacity_kg: z.coerce.number().positive(),
    leakage_rate: z.coerce.number().min(0).max(1),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  }),
])
  .superRefine((d, ctx) => {
    if (d.method === "screening" && !d.asset_category_id && !(d.leakage_rate > 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["asset_category_id"],
        message: "Pilih kategori aset atau isi leakage rate",
      });
    }
  });

export async function updateFugitive(
  id: string,
  input: z.infer<typeof updateFugitiveSchema>,
): Promise<R> {
  const p = updateFugitiveSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };
  const { supabase, companyId } = await getContext();
  if (!companyId) return { error: "Tidak terautentikasi" };

  const { data: existing } = await supabase
    .from("ca_fugitive")
    .select("status")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (!existing) return { error: "Data tidak ditemukan" };
  if (existing.status !== "draft") return { error: "Hanya draft yang bisa diedit" };

  const conflict = await assertNoPeriodConflict("ca_fugitive", p.data.period_start, {
    excludeId: id,
    label: "emisi fugitif",
  });
  if (conflict) return conflict;

  const d = p.data;
  let calcResult: ReturnType<typeof calcFugitiveTopUp>;

  if (d.method === "top_up") {
    calcResult = calcFugitiveTopUp(d.mass_refilled_kg, d.gwp_value, d.refrigerant_name);
  } else {
    calcResult = calcFugitiveScreening(
      d.total_capacity_kg,
      d.leakage_rate,
      d.gwp_value,
      d.refrigerant_name,
      d.asset_category_name,
    );
  }

  const updateData = {
    method: d.method,
    refrigerant_name: d.refrigerant_name,
    refrigerant_gwp_id: "refrigerant_gwp_id" in d ? (d.refrigerant_gwp_id ?? null) : null,
    gwp_value: d.gwp_value,
    mass_refilled_kg: d.method === "top_up" ? d.mass_refilled_kg : null,
    asset_category_id: d.method === "screening" ? (d.asset_category_id ?? null) : null,
    asset_category_name: d.method === "screening" ? d.asset_category_name : null,
    total_capacity_kg: d.method === "screening" ? d.total_capacity_kg : null,
    leakage_rate: d.method === "screening" ? d.leakage_rate : null,
    estimated_leakage_kg: calcResult.estimated_leakage_kg,
    emission_co2e: calcResult.emission_co2e,
    period_start: d.period_start,
    period_end: d.period_end,
    notes: d.notes ?? null,
    ef_snapshot: calcResult.ef_snapshot as unknown as Json,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ca_fugitive")
    .update(updateData)
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true };
}

// Update Energy draft
const updateEnergySchema = z
  .object({
    energy_type: z.enum(["electricity", "steam"]),
    grid_ef_id: z.string().uuid().optional(),
    region_name: z.string().optional(),
    unit: z.enum(["kWh", "MWh", "MMBtu"]),
    consumption: z.coerce.number().positive(),
    use_custom_ef: z.boolean().default(false),
    custom_ef_kg_co2e: z.coerce.number().nonnegative().optional(),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.use_custom_ef) {
      if (data.custom_ef_kg_co2e === undefined || data.custom_ef_kg_co2e <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["custom_ef_kg_co2e"],
          message: "Isi faktor emisi custom yang valid",
        });
      }
    } else if (!data.grid_ef_id) {
      ctx.addIssue({
        code: "custom",
        path: ["grid_ef_id"],
        message: "Pilih wilayah grid atau aktifkan custom EF",
      });
    }
  });

export async function updateEnergy(
  id: string,
  input: z.infer<typeof updateEnergySchema>,
): Promise<R> {
  const p = updateEnergySchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };
  const { supabase, companyId } = await getContext();
  if (!companyId) return { error: "Tidak terautentikasi" };

  const { data: existing } = await supabase
    .from("ca_energy")
    .select("status")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (!existing) return { error: "Data tidak ditemukan" };
  if (existing.status !== "draft") return { error: "Hanya draft yang bisa diedit" };

  const conflict = await assertNoPeriodConflict("ca_energy", p.data.period_start, {
    excludeId: id,
    label: "pemakaian energi",
  });
  if (conflict) return conflict;

  let efData = null;
  if (p.data.grid_ef_id) {
    const { data } = await supabase
      .from("grid_emission_factors")
      .select("*")
      .eq("id", p.data.grid_ef_id)
      .single();
    efData = data;
  }

  const calcResult = calcEnergy(
    p.data.consumption,
    efData,
    p.data.use_custom_ef ? p.data.custom_ef_kg_co2e : undefined,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ca_energy")
    .update({
      energy_type: p.data.energy_type,
      grid_ef_id: efData?.id ?? null,
      region_name: p.data.region_name ?? null,
      unit: p.data.unit,
      consumption: p.data.consumption,
      use_custom_ef: p.data.use_custom_ef,
      custom_ef_kg_co2e: p.data.custom_ef_kg_co2e ?? null,
      emission_co2e: calcResult.emission_co2e,
      ef_snapshot: calcResult.ef_snapshot as unknown as Json,
      period_start: p.data.period_start,
      period_end: p.data.period_end,
      notes: p.data.notes ?? null,
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true };
}

// Update S3C1 draft
const updateS3C1Schema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("supplier_specific"),
    supplier_name: z.string().min(1),
    product_name: z.string().min(1),
    supplier_ef_kg_co2e_per_unit: z.coerce.number().nonnegative(),
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("average_data"),
    ef_average_id: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("spend_based"),
    ef_spend_id: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    currency: z.string(),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  }),
]);

export async function updateS3C1(
  id: string,
  input: z.infer<typeof updateS3C1Schema>,
): Promise<R> {
  const p = updateS3C1Schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };
  const { supabase, companyId } = await getContext();
  if (!companyId) return { error: "Tidak terautentikasi" };

  const { data: existing } = await supabase
    .from("ca_s3c1")
    .select("status")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (!existing) return { error: "Data tidak ditemukan" };
  if (existing.status !== "draft") return { error: "Hanya draft yang bisa diedit" };

  const conflict = await assertNoPeriodConflict("ca_s3c1", p.data.period_start, {
    excludeId: id,
    label: "pembelian barang (Scope 3 Cat 1)",
  });
  if (conflict) return conflict;

  const d = p.data;
  let calcResult: { emission_co2e: number; ef_snapshot: object };
  let materialName: string | null = null;
  let materialUnit: string | null = null;
  let sectorName: string | null = null;
  let spendCurrency: string | null = null;

  if (d.method === "supplier_specific") {
    calcResult = calcS3C1SupplierSpecific(
      d.quantity,
      d.unit,
      d.supplier_ef_kg_co2e_per_unit,
      d.supplier_name,
      d.product_name,
    );
  } else if (d.method === "average_data") {
    const { data: ef } = await supabase
      .from("s3c1_average_factors")
      .select("*")
      .eq("id", d.ef_average_id)
      .single();
    if (!ef) return { error: "Faktor emisi tidak ditemukan" };
    calcResult = calcS3C1AverageData(d.quantity, ef);
    materialName = ef.material_name;
    materialUnit = ef.unit;
  } else {
    const { data: ef } = await supabase
      .from("s3c1_spend_factors")
      .select("*")
      .eq("id", d.ef_spend_id)
      .single();
    if (!ef) return { error: "Faktor emisi tidak ditemukan" };
    calcResult = calcS3C1SpendBased(d.quantity, d.currency, ef);
    sectorName = ef.sector_name;
    spendCurrency = ef.currency;
  }

  const updateData = {
    method: d.method,
    supplier_name: d.method === "supplier_specific" ? d.supplier_name : null,
    product_name: d.method === "supplier_specific" ? d.product_name : null,
    supplier_ef_kg_co2e_per_unit:
      d.method === "supplier_specific" ? d.supplier_ef_kg_co2e_per_unit : null,
    ef_average_id: d.method === "average_data" ? d.ef_average_id : null,
    material_name: materialName,
    ef_spend_id: d.method === "spend_based" ? d.ef_spend_id : null,
    sector_name: sectorName,
    currency: spendCurrency ?? (d.method === "spend_based" ? d.currency : null),
    quantity: d.quantity,
    unit:
      d.method === "spend_based"
        ? (spendCurrency ?? d.currency)
        : (materialUnit ?? d.unit),
    emission_co2e: calcResult.emission_co2e,
    ef_snapshot: calcResult.ef_snapshot as unknown as Json,
    period_start: d.period_start,
    period_end: d.period_end,
    notes: d.notes ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ca_s3c1")
    .update(updateData)
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true };
}

// ── Scope 3 Cat 2 (Capital Goods) ────────────────────────
// Struktur identik dengan S3C1, hanya beda tabel DB.

const s3c2Schema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("supplier_specific"),
    supplier_name: z.string().min(1),
    product_name: z.string().min(1),
    supplier_ef_kg_co2e_per_unit: z.coerce.number().nonnegative(),
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1),
    ...period,
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("average_data"),
    ef_average_id: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1),
    ...period,
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("spend_based"),
    ef_spend_id: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    currency: z.string(),
    ...period,
    notes: z.string().optional(),
  }),
]);

export async function submitS3C2(
  input: z.infer<typeof s3c2Schema>,
): Promise<R> {
  const p = s3c2Schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };

  const conflict = await assertNoPeriodConflict("ca_s3c2", p.data.period_start, {
    label: "pembelian barang (Scope 3 Cat 2)",
  });
  if (conflict) return conflict;

  const { supabase, user, companyId } = await getContext();
  if (!user || !companyId) return { error: "Tidak terautentikasi" };

  const d = p.data;
  let calcResult: { emission_co2e: number; ef_snapshot: object };
  let materialName: string | null = null;
  let materialUnit: string | null = null;
  let sectorName: string | null = null;
  let spendCurrency: string | null = null;

  if (d.method === "supplier_specific") {
    calcResult = calcS3C1SupplierSpecific(
      d.quantity,
      d.unit,
      d.supplier_ef_kg_co2e_per_unit,
      d.supplier_name,
      d.product_name,
    );
  } else if (d.method === "average_data") {
    const { data: ef } = await supabase
      .from("s3c2_average_factors")
      .select("*")
      .eq("id", d.ef_average_id)
      .single();
    if (!ef) return { error: "Faktor emisi tidak ditemukan" };
    calcResult = calcS3C1AverageData(d.quantity, ef);
    materialName = ef.material_name;
    materialUnit = ef.unit;
  } else {
    const { data: ef } = await supabase
      .from("s3c2_spend_factors")
      .select("*")
      .eq("id", d.ef_spend_id)
      .single();
    if (!ef) return { error: "Faktor emisi tidak ditemukan" };
    calcResult = calcS3C1SpendBased(d.quantity, d.currency, ef);
    sectorName = ef.sector_name;
    spendCurrency = ef.currency;
  }

  const insertData = {
    company_id: companyId,
    submitted_by: user.id,
    method: d.method,
    supplier_name: d.method === "supplier_specific" ? d.supplier_name : null,
    product_name: d.method === "supplier_specific" ? d.product_name : null,
    supplier_ef_kg_co2e_per_unit:
      d.method === "supplier_specific" ? d.supplier_ef_kg_co2e_per_unit : null,
    ef_average_id: d.method === "average_data" ? d.ef_average_id : null,
    material_name: materialName,
    ef_spend_id: d.method === "spend_based" ? d.ef_spend_id : null,
    sector_name: sectorName,
    currency: spendCurrency ?? (d.method === "spend_based" ? d.currency : null),
    quantity: d.quantity,
    unit:
      d.method === "spend_based"
        ? (spendCurrency ?? d.currency)
        : (materialUnit ?? d.unit),
    emission_co2e: calcResult.emission_co2e,
    ef_snapshot: calcResult.ef_snapshot as unknown as Json,
    period_start: d.period_start,
    period_end: d.period_end,
    notes: d.notes ?? null,
    status: "confirmed" as const,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("ca_s3c2")
    .insert(insertData)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true, id: data.id };
}

export async function reviewS3C2(
  id: string,
  action: "confirmed" | "rejected",
): Promise<R> {
  return reviewEntry("ca_s3c2", id, action);
}

export async function deleteS3C2(id: string): Promise<R> {
  const { supabase, companyId } = await getContext();
  if (!companyId) return { error: "Tidak terautentikasi" };
  const { error } = await supabase
    .from("ca_s3c2")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true };
}

const CA_TABLES: Record<string, string> = {
  combustion: 'ca_combustion',
  vehicle: 'ca_vehicle',
  fugitive: 'ca_fugitive',
  energy: 'ca_energy',
  s3c1: 'ca_s3c1',
  s3c2: 'ca_s3c2',
}



// ── Delete confirmed entry ──────────────────────────────
const deleteConfirmedSchema = z.object({
  type: z.enum(['combustion', 'vehicle', 'fugitive', 'energy', 's3c1', 's3c2']),
  id: z.string().uuid(),
})

export async function deleteConfirmedEntry(
  input: z.infer<typeof deleteConfirmedSchema>,
): Promise<R> {
  const p = deleteConfirmedSchema.safeParse(input)
  if (!p.success) return { error: 'Invalid' }
  const { supabase, companyId } = await getContext()
  if (!companyId) return { error: 'Tidak terautentikasi' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from(CA_TABLES[p.data.type])
    .delete()
    .eq('id', p.data.id)
    .eq('company_id', companyId)
    .eq('status', 'confirmed')

  if (error) return { error: error.message }
  revalidatePath('/company/carbon')
  return { success: true }
}
// Update S3C2 draft — identik dengan updateS3C1 tapi pakai s3c2_* tables
const updateS3C2Schema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("supplier_specific"),
    supplier_name: z.string().min(1),
    product_name: z.string().min(1),
    supplier_ef_kg_co2e_per_unit: z.coerce.number().nonnegative(),
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("average_data"),
    ef_average_id: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  }),
  z.object({
    method: z.literal("spend_based"),
    ef_spend_id: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    currency: z.string(),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional(),
  }),
]);

export async function updateS3C2(
  id: string,
  input: z.infer<typeof updateS3C2Schema>,
): Promise<R> {
  const p = updateS3C2Schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid" };
  const { supabase, companyId } = await getContext();
  if (!companyId) return { error: "Tidak terautentikasi" };

  const { data: existing } = await supabase
    .from("ca_s3c2")
    .select("status")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (!existing) return { error: "Data tidak ditemukan" };
  if (existing.status !== "draft") return { error: "Hanya draft yang bisa diedit" };

  const conflict = await assertNoPeriodConflict("ca_s3c2", p.data.period_start, {
    excludeId: id,
    label: "pembelian barang (Scope 3 Cat 2)",
  });
  if (conflict) return conflict;

  const d = p.data;
  let calcResult: { emission_co2e: number; ef_snapshot: object };
  let materialName: string | null = null;
  let materialUnit: string | null = null;
  let sectorName: string | null = null;
  let spendCurrency: string | null = null;

  if (d.method === "supplier_specific") {
    calcResult = calcS3C1SupplierSpecific(
      d.quantity,
      d.unit,
      d.supplier_ef_kg_co2e_per_unit,
      d.supplier_name,
      d.product_name,
    );
  } else if (d.method === "average_data") {
    const { data: ef } = await supabase
      .from("s3c2_average_factors")
      .select("*")
      .eq("id", d.ef_average_id)
      .single();
    if (!ef) return { error: "Faktor emisi tidak ditemukan" };
    calcResult = calcS3C1AverageData(d.quantity, ef);
    materialName = ef.material_name;
    materialUnit = ef.unit;
  } else {
    const { data: ef } = await supabase
      .from("s3c2_spend_factors")
      .select("*")
      .eq("id", d.ef_spend_id)
      .single();
    if (!ef) return { error: "Faktor emisi tidak ditemukan" };
    calcResult = calcS3C1SpendBased(d.quantity, d.currency, ef);
    sectorName = ef.sector_name;
    spendCurrency = ef.currency;
  }

  const updateData = {
    method: d.method,
    supplier_name: d.method === "supplier_specific" ? d.supplier_name : null,
    product_name: d.method === "supplier_specific" ? d.product_name : null,
    supplier_ef_kg_co2e_per_unit:
      d.method === "supplier_specific" ? d.supplier_ef_kg_co2e_per_unit : null,
    ef_average_id: d.method === "average_data" ? d.ef_average_id : null,
    material_name: materialName,
    ef_spend_id: d.method === "spend_based" ? d.ef_spend_id : null,
    sector_name: sectorName,
    currency: spendCurrency ?? (d.method === "spend_based" ? d.currency : null),
    quantity: d.quantity,
    unit:
      d.method === "spend_based"
        ? (spendCurrency ?? d.currency)
        : (materialUnit ?? d.unit),
    emission_co2e: calcResult.emission_co2e,
    ef_snapshot: calcResult.ef_snapshot as unknown as Json,
    period_start: d.period_start,
    period_end: d.period_end,
    notes: d.notes ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ca_s3c2")
    .update(updateData)
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath("/company/carbon");
  return { success: true };
}
