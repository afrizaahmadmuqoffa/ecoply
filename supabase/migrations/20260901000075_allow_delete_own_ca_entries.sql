-- ============================================================
-- Izinkan company menghapus entri ca_* miliknya sendiri
-- (termasuk status confirmed/rejected).
--
-- Sebelumnya m66 (phase7_security_rls) membatasi DELETE ke
-- status = 'draft' saja → hapus confirmed selalu menghapus 0
-- baris via client user-scoped (RLS filter). Beri kemampuan
-- hapus entri confirmed sesuai kebutuhan bisnis baru.
--
-- Policy UPDATE TIDAK diubah → entri confirmed tetap
-- tidak bisa diedit (hanya bisa dihapus lalu dibuat ulang).
-- ============================================================

-- ── ca_combustion ─────────────────────────────────────────
DROP POLICY IF EXISTS "ca_combustion_delete_own" ON public.ca_combustion;
CREATE POLICY "ca_combustion_delete_own"
  ON public.ca_combustion
  FOR DELETE
  USING (company_id = public.get_company_id());

-- ── ca_vehicle ────────────────────────────────────────────
DROP POLICY IF EXISTS "ca_vehicle_delete_own" ON public.ca_vehicle;
CREATE POLICY "ca_vehicle_delete_own"
  ON public.ca_vehicle
  FOR DELETE
  USING (company_id = public.get_company_id());

-- ── ca_fugitive ───────────────────────────────────────────
DROP POLICY IF EXISTS "ca_fugitive_delete_own" ON public.ca_fugitive;
CREATE POLICY "ca_fugitive_delete_own"
  ON public.ca_fugitive
  FOR DELETE
  USING (company_id = public.get_company_id());

-- ── ca_energy ─────────────────────────────────────────────
DROP POLICY IF EXISTS "ca_energy_delete_own" ON public.ca_energy;
CREATE POLICY "ca_energy_delete_own"
  ON public.ca_energy
  FOR DELETE
  USING (company_id = public.get_company_id());

-- ── ca_s3c1 ───────────────────────────────────────────────
DROP POLICY IF EXISTS "ca_s3c1_delete_own" ON public.ca_s3c1;
CREATE POLICY "ca_s3c1_delete_own"
  ON public.ca_s3c1
  FOR DELETE
  USING (company_id = public.get_company_id());

-- ── ca_s3c2 (nama policy asli dari m22 berbeda) ───────────
DROP POLICY IF EXISTS "ca_s3c2: company can delete draft" ON public.ca_s3c2;
CREATE POLICY "ca_s3c2: company can delete own"
  ON public.ca_s3c2
  FOR DELETE
  USING (company_id = public.get_company_id());