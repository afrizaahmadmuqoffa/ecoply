-- ============================================================
-- FASE 7 — Security Hardening (RLS)
--
-- Perbaikan:
--   1) get_company_id() SECURITY DEFINER tanpa search_path → hijack risk
--   2) recycling_avoided_factors: semua authenticated bisa WRITE → admin-only
--   3) companies/recyclers (m36): semua authenticated baca semua (PII bocor)
--      → base table owner+admin only; cross-party via view aman-PII
--   4) recycler_details: policy anon "Anyone can view active" → dihapus, +
--      policy admin-read (dibutuhkan halaman verifikasi)
--   5) Storage policy admin rusak (profiles.user_id) di m33/m59 → is_admin()
--   6) Policy ca_*_update_own/delete_own tanpa filter status → hanya draft
--   7) Unique (entity_type, entity_id) di verification_requests + helper
--      reset_verification_to_pending() untuk self-reopen saat ditolak
-- ============================================================

-- ============================================================
-- 1) get_company_id(): amankan search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- ============================================================
-- 2) recycling_avoided_factors: write hanya admin
-- ============================================================
REVOKE ALL ON public.recycling_avoided_factors FROM anon, public;
REVOKE ALL ON public.recycling_avoided_factors FROM authenticated;
GRANT SELECT ON public.recycling_avoided_factors TO authenticated;
GRANT ALL ON public.recycling_avoided_factors TO service_role;

DROP POLICY IF EXISTS "recycling_factors_select" ON public.recycling_avoided_factors;
DROP POLICY IF EXISTS "recycling_factors_write"   ON public.recycling_avoided_factors;

CREATE POLICY "recycling_factors_select"
  ON public.recycling_avoided_factors
  FOR SELECT
  USING (true);

CREATE POLICY "recycling_factors_insert_admin"
  ON public.recycling_avoided_factors
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "recycling_factors_update_admin"
  ON public.recycling_avoided_factors
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "recycling_factors_delete_admin"
  ON public.recycling_avoided_factors
  FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- 3) companies/recyclers: base table owner+admin, cross-party
--    via view aman-PII (verified only)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view company public info" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view recycler public info" ON public.recyclers;

-- Cross-party read pada base table dihapus (mengandung PII: npwp, address).
-- Siapapun selain owner/admin harus lewat view di bawah ini.
DROP POLICY IF EXISTS "companies: recycler can read verified" ON public.companies;
DROP POLICY IF EXISTS "recyclers: company can read verified"  ON public.recyclers;

-- ── VIEW aman-PII ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_company_public
WITH (security_barrier = true)
AS
  SELECT
    id,
    name,
    industry,
    logo_url,
    certifications,
    verification_status,
    location,
    address_text,
    created_at
  FROM public.companies
  WHERE verification_status = 'verified';

CREATE OR REPLACE VIEW public.view_recycler_public
WITH (security_barrier = true)
AS
  SELECT
    r.id,
    r.name,
    r.address,
    r.logo_url,
    r.capacity_kg_per_month,
    r.verification_status,
    r.created_at,
    rd.id AS details_id,
    rd.location,
    rd.service_radius_km,
    rd.accepted_materials,
    rd.capacity_per_month,
    rd.certifications,
    rd.is_active
  FROM public.recyclers r
  LEFT JOIN public.recycler_details rd ON rd.recycler_id = r.id
  WHERE r.verification_status = 'verified';

REVOKE ALL ON public.view_company_public  FROM public;
REVOKE ALL ON public.view_recycler_public FROM public;
GRANT SELECT ON public.view_company_public  TO authenticated;
GRANT SELECT ON public.view_recycler_public TO authenticated;

-- ============================================================
-- 4) recycler_details: hilangkan akses anon, tambah admin-read
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view active recycler details" ON public.recycler_details;

CREATE POLICY "recycler_details: admin can read all"
  ON public.recycler_details
  FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 5) Fix policy admin storage (m33/m59) yang merujuk kolom
--    non-eksisten profiles.user_id
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all certs" ON storage.objects;
CREATE POLICY "admins can view recycled certs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'recycler-certs'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admin bisa melihat semua sertifikat perusahaan" ON storage.objects;
CREATE POLICY "admins can view company certs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'company-certs'
    AND public.is_admin()
  );

-- ============================================================
-- 6) ca_*: update/delete hanya untuk status draft
--    (drop policy m21/m22 yang tanpa filter status)
-- ============================================================
DROP POLICY IF EXISTS "ca_combustion_update_own" ON public.ca_combustion;
DROP POLICY IF EXISTS "ca_combustion_delete_own" ON public.ca_combustion;
DROP POLICY IF EXISTS "ca_vehicle_update_own"     ON public.ca_vehicle;
DROP POLICY IF EXISTS "ca_vehicle_delete_own"     ON public.ca_vehicle;
DROP POLICY IF EXISTS "ca_fugitive_update_own"    ON public.ca_fugitive;
DROP POLICY IF EXISTS "ca_fugitive_delete_own"    ON public.ca_fugitive;
DROP POLICY IF EXISTS "ca_energy_update_own"      ON public.ca_energy;
DROP POLICY IF EXISTS "ca_energy_delete_own"      ON public.ca_energy;
DROP POLICY IF EXISTS "ca_s3c1_update_own"        ON public.ca_s3c1;
DROP POLICY IF EXISTS "ca_s3c1_delete_own"        ON public.ca_s3c1;
DROP POLICY IF EXISTS "ca_s3c2: company can update own" ON public.ca_s3c2;

-- Recreate dengan batas status draft (sejalan policy asli m16/m22)
CREATE POLICY "ca_combustion_update_own"
  ON public.ca_combustion
  FOR UPDATE
  USING (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

CREATE POLICY "ca_combustion_delete_own"
  ON public.ca_combustion
  FOR DELETE
  USING (company_id = public.get_company_id() AND status = 'draft');

CREATE POLICY "ca_vehicle_update_own"
  ON public.ca_vehicle
  FOR UPDATE
  USING (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

CREATE POLICY "ca_vehicle_delete_own"
  ON public.ca_vehicle
  FOR DELETE
  USING (company_id = public.get_company_id() AND status = 'draft');

CREATE POLICY "ca_fugitive_update_own"
  ON public.ca_fugitive
  FOR UPDATE
  USING (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

CREATE POLICY "ca_fugitive_delete_own"
  ON public.ca_fugitive
  FOR DELETE
  USING (company_id = public.get_company_id() AND status = 'draft');

CREATE POLICY "ca_energy_update_own"
  ON public.ca_energy
  FOR UPDATE
  USING (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

CREATE POLICY "ca_energy_delete_own"
  ON public.ca_energy
  FOR DELETE
  USING (company_id = public.get_company_id() AND status = 'draft');

CREATE POLICY "ca_s3c1_update_own"
  ON public.ca_s3c1
  FOR UPDATE
  USING (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

CREATE POLICY "ca_s3c1_delete_own"
  ON public.ca_s3c1
  FOR DELETE
  USING (company_id = public.get_company_id() AND status = 'draft');

CREATE POLICY "ca_s3c2: company can update own"
  ON public.ca_s3c2
  FOR UPDATE
  USING (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

-- ============================================================
-- 7) verification_requests: unique + helper self-reopen
-- ============================================================

-- Unique (mencegah duplikat request saat auto-reopen)
DELETE FROM public.verification_requests a
USING public.verification_requests b
WHERE a.id <> b.id
  AND a.entity_type = b.entity_type
  AND a.entity_id = b.entity_id;

DROP INDEX IF EXISTS public.vr_entity_idx;
CREATE UNIQUE INDEX vr_entity_unique
  ON public.verification_requests(entity_type, entity_id);
CREATE INDEX vr_entity_idx
  ON public.verification_requests(entity_type, entity_id);

-- Helper: user pemilik set verification jadi pending (saat memperbaiki
-- profil setelah DITOLAK). Hanya pemilik entity yang bisa memanggil.
CREATE OR REPLACE FUNCTION public.reset_verification_to_pending(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_entity_type = 'company' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = p_entity_id AND user_id = auth.uid()
    ) THEN
      RETURN false;
    END IF;
    UPDATE public.companies
    SET verification_status = 'pending', updated_at = now()
    WHERE id = p_entity_id;
    UPDATE public.profiles
    SET verification_status = 'pending', updated_at = now()
    WHERE company_id = p_entity_id;
  ELSIF p_entity_type = 'recycler' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.recyclers
      WHERE id = p_entity_id AND user_id = auth.uid()
    ) THEN
      RETURN false;
    END IF;
    UPDATE public.recyclers
    SET verification_status = 'pending', updated_at = now()
    WHERE id = p_entity_id;
    UPDATE public.profiles
    SET verification_status = 'pending', updated_at = now()
    WHERE recycler_id = p_entity_id;
  ELSE
    RETURN false;
  END IF;

  UPDATE public.verification_requests
  SET status = 'pending', reviewed_by = null, reviewed_at = null, note = null
  WHERE entity_type = p_entity_type::public.entity_type
    AND entity_id = p_entity_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_verification_to_pending(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.reset_verification_to_pending(text, uuid) TO authenticated;