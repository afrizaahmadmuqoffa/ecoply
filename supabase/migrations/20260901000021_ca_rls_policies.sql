-- ============================================================
-- RLS Policies untuk semua tabel ca_* (Carbon Accounting)
-- ============================================================
-- Strategi:
--   - Company hanya bisa akses data milik mereka sendiri
--   - Lookup company_id via profiles table
--   - Service role (admin client) otomatis bypass RLS
-- ============================================================

-- ── Helper function: get company_id dari auth.uid() ──────

CREATE OR REPLACE FUNCTION public.get_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE id = auth.uid();
$$;

-- ── ca_combustion ─────────────────────────────────────────

ALTER TABLE ca_combustion ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "ca_combustion_select_own" ON ca_combustion;
DROP POLICY IF EXISTS "ca_combustion_insert_own" ON ca_combustion;
DROP POLICY IF EXISTS "ca_combustion_update_own" ON ca_combustion;
DROP POLICY IF EXISTS "ca_combustion_delete_own" ON ca_combustion;

-- SELECT: company bisa lihat data milik mereka
CREATE POLICY "ca_combustion_select_own" ON ca_combustion
  FOR SELECT
  USING (company_id = public.get_company_id());

-- INSERT: company bisa insert data dengan company_id yang match
CREATE POLICY "ca_combustion_insert_own" ON ca_combustion
  FOR INSERT
  WITH CHECK (company_id = public.get_company_id());

-- UPDATE: company bisa update data milik mereka (untuk confirm/reject)
CREATE POLICY "ca_combustion_update_own" ON ca_combustion
  FOR UPDATE
  USING (company_id = public.get_company_id())
  WITH CHECK (company_id = public.get_company_id());

-- DELETE: company bisa delete draft milik mereka
CREATE POLICY "ca_combustion_delete_own" ON ca_combustion
  FOR DELETE
  USING (company_id = public.get_company_id());


-- ── ca_vehicle ────────────────────────────────────────────

ALTER TABLE ca_vehicle ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ca_vehicle_select_own" ON ca_vehicle;
DROP POLICY IF EXISTS "ca_vehicle_insert_own" ON ca_vehicle;
DROP POLICY IF EXISTS "ca_vehicle_update_own" ON ca_vehicle;
DROP POLICY IF EXISTS "ca_vehicle_delete_own" ON ca_vehicle;

CREATE POLICY "ca_vehicle_select_own" ON ca_vehicle
  FOR SELECT
  USING (company_id = public.get_company_id());

CREATE POLICY "ca_vehicle_insert_own" ON ca_vehicle
  FOR INSERT
  WITH CHECK (company_id = public.get_company_id());

CREATE POLICY "ca_vehicle_update_own" ON ca_vehicle
  FOR UPDATE
  USING (company_id = public.get_company_id())
  WITH CHECK (company_id = public.get_company_id());

CREATE POLICY "ca_vehicle_delete_own" ON ca_vehicle
  FOR DELETE
  USING (company_id = public.get_company_id());


-- ── ca_fugitive ───────────────────────────────────────────

ALTER TABLE ca_fugitive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ca_fugitive_select_own" ON ca_fugitive;
DROP POLICY IF EXISTS "ca_fugitive_insert_own" ON ca_fugitive;
DROP POLICY IF EXISTS "ca_fugitive_update_own" ON ca_fugitive;
DROP POLICY IF EXISTS "ca_fugitive_delete_own" ON ca_fugitive;

CREATE POLICY "ca_fugitive_select_own" ON ca_fugitive
  FOR SELECT
  USING (company_id = public.get_company_id());

CREATE POLICY "ca_fugitive_insert_own" ON ca_fugitive
  FOR INSERT
  WITH CHECK (company_id = public.get_company_id());

CREATE POLICY "ca_fugitive_update_own" ON ca_fugitive
  FOR UPDATE
  USING (company_id = public.get_company_id())
  WITH CHECK (company_id = public.get_company_id());

CREATE POLICY "ca_fugitive_delete_own" ON ca_fugitive
  FOR DELETE
  USING (company_id = public.get_company_id());


-- ── ca_energy ─────────────────────────────────────────────

ALTER TABLE ca_energy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ca_energy_select_own" ON ca_energy;
DROP POLICY IF EXISTS "ca_energy_insert_own" ON ca_energy;
DROP POLICY IF EXISTS "ca_energy_update_own" ON ca_energy;
DROP POLICY IF EXISTS "ca_energy_delete_own" ON ca_energy;

CREATE POLICY "ca_energy_select_own" ON ca_energy
  FOR SELECT
  USING (company_id = public.get_company_id());

CREATE POLICY "ca_energy_insert_own" ON ca_energy
  FOR INSERT
  WITH CHECK (company_id = public.get_company_id());

CREATE POLICY "ca_energy_update_own" ON ca_energy
  FOR UPDATE
  USING (company_id = public.get_company_id())
  WITH CHECK (company_id = public.get_company_id());

CREATE POLICY "ca_energy_delete_own" ON ca_energy
  FOR DELETE
  USING (company_id = public.get_company_id());


-- ── ca_s3c1 ───────────────────────────────────────────────

ALTER TABLE ca_s3c1 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ca_s3c1_select_own" ON ca_s3c1;
DROP POLICY IF EXISTS "ca_s3c1_insert_own" ON ca_s3c1;
DROP POLICY IF EXISTS "ca_s3c1_update_own" ON ca_s3c1;
DROP POLICY IF EXISTS "ca_s3c1_delete_own" ON ca_s3c1;

CREATE POLICY "ca_s3c1_select_own" ON ca_s3c1
  FOR SELECT
  USING (company_id = public.get_company_id());

CREATE POLICY "ca_s3c1_insert_own" ON ca_s3c1
  FOR INSERT
  WITH CHECK (company_id = public.get_company_id());

CREATE POLICY "ca_s3c1_update_own" ON ca_s3c1
  FOR UPDATE
  USING (company_id = public.get_company_id())
  WITH CHECK (company_id = public.get_company_id());

CREATE POLICY "ca_s3c1_delete_own" ON ca_s3c1
  FOR DELETE
  USING (company_id = public.get_company_id());